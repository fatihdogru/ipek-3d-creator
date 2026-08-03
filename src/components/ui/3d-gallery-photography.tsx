import type React from 'react';
import { Suspense, useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type ImageItem = string | { src: string; alt?: string };

interface FadeSettings {
	fadeIn: {
		start: number;
		end: number;
	};
	fadeOut: {
		start: number;
		end: number;
	};
}

interface BlurSettings {
	blurIn: {
		start: number;
		end: number;
	};
	blurOut: {
		start: number;
		end: number;
	};
	maxBlur: number;
}

interface InfiniteGalleryProps {
	images: ImageItem[];
	speed?: number;
	zSpacing?: number;
	visibleCount?: number;
	falloff?: { near: number; far: number };
	fadeSettings?: FadeSettings;
	blurSettings?: BlurSettings;
	className?: string;
	style?: React.CSSProperties;
	/**
	 * 'canvas'   — the gallery swallows wheel events over the canvas and listens
	 * for arrow keys. Right for a full-page, standalone gallery.
	 * 'page'     — the gallery drifts along with the document's own scroll and
	 * never blocks it.
	 * 'progress' — the gallery is scrubbed by `progressRef`: depth maps straight
	 * onto 0..1, so scrolling back rewinds it exactly. Right for a pinned
	 * section that hands scrolling back to the page once it completes.
	 */
	scrollMode?: 'canvas' | 'page' | 'progress';
	/**
	 * Scrub position for `scrollMode="progress"`, 0..1. A ref rather than a prop
	 * value so the driver can update it every scroll event without re-rendering
	 * the scene.
	 */
	progressRef?: { current: number };
	/** How many full depth cycles the gallery travels across progress 0 -> 1. */
	progressCycles?: number;
	/**
	 * How hard the scrub chases the scroll position, per second. Lower is looser
	 * and rubberier — the gallery keeps easing for a moment after you stop.
	 */
	progressSmoothing?: number;
	/** Seconds of no scrolling before the gallery starts drifting on its own. */
	idleDelay?: number;
	/** Drift speed once idle, in progress units per second. */
	idleSpeed?: number;
}

interface PlaneData {
	index: number;
	z: number;
	imageIndex: number;
	x: number;
	y: number;
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

/** `Texture.image` is untyped in three's defs; it's an ImageBitmap/HTMLImageElement here. */
const textureAspect = (texture: THREE.Texture) => {
	const image = texture.image as { width?: number; height?: number } | undefined;
	if (!image?.width || !image?.height) return 1;
	return image.width / image.height;
};

const createClothMaterial = () => {
	return new THREE.ShaderMaterial({
		transparent: true,
		uniforms: {
			map: { value: null },
			opacity: { value: 1.0 },
			blurAmount: { value: 0.0 },
			scrollForce: { value: 0.0 },
			time: { value: 0.0 },
			isHovered: { value: 0.0 },
		},
		vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normal;

        vec3 pos = position;

        // Create smooth curving based on scroll force
        float curveIntensity = scrollForce * 0.3;

        // Base curve across the plane based on distance from center
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;

        // Add gentle cloth-like ripples
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

        // Flag waving effect when hovered
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          // Create flag-like wave from left to right
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          // Damping effect - stronger wave on the right side (free edge)
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;

          // Add secondary smaller waves for more realistic flag motion
          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }

        // Apply Z displacement for curving effect (inverted) with cloth ripples and flag wave
        pos.z -= (curve + clothEffect + flagWave);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
		fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec4 color = texture2D(map, vUv);

        // Simple blur approximation
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;

          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }

        // Add subtle lighting effect based on curving
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);

        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
	});
};

function ImagePlane({
	texture,
	position,
	scale,
	material,
	onMesh,
}: {
	texture: THREE.Texture;
	position: [number, number, number];
	scale: [number, number, number];
	material: THREE.ShaderMaterial;
	onMesh?: (mesh: THREE.Mesh | null) => void;
}) {
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		if (material && texture) {
			material.uniforms.map.value = texture;
		}
	}, [material, texture]);

	useEffect(() => {
		if (material && material.uniforms) {
			material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
		}
	}, [material, isHovered]);

	return (
		<mesh
			ref={(node) => onMesh?.(node)}
			position={position}
			scale={scale}
			material={material}
			onPointerEnter={() => setIsHovered(true)}
			onPointerLeave={() => setIsHovered(false)}
		>
			<planeGeometry args={[1, 1, 32, 32]} />
		</mesh>
	);
}

function GalleryScene({
	images,
	speed = 1,
	visibleCount = 8,
	scrollMode = 'canvas',
	progressRef,
	progressCycles = 1.5,
	progressSmoothing = 3.5,
	idleDelay = 3,
	idleSpeed = 0.02,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.15 },
		fadeOut: { start: 0.85, end: 0.95 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.9, end: 1.0 },
		maxBlur: 3.0,
	},
}: Omit<InfiniteGalleryProps, 'className' | 'style'>) {
	// Velocity lives in a ref, not state: it changes every frame and driving it
	// through setState would re-render the whole scene 60x a second.
	const scrollVelocity = useRef(0);
	const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
	// Scrubbed mode keeps three separate numbers: where the scroll actually is,
	// how far the idle drift has carried us past it, and the eased value that is
	// actually rendered (which trails both).
	const lastProgress = useRef(0);
	const smoothProgress = useRef(0);
	const idleOffset = useRef(0);
	const idleTime = useRef(0);
	const [autoPlay, setAutoPlay] = useState(scrollMode !== 'progress');
	const lastInteraction = useRef(0);
	const glCanvas = useThree((state) => state.gl.domElement);

	const normalizedImages = useMemo(
		() =>
			images.map((img) =>
				typeof img === 'string' ? { src: img, alt: '' } : img
			),
		[images]
	);

	const textures = useTexture(normalizedImages.map((img) => img.src));

	// Deliberately left at three's default (no color space) rather than tagged
	// sRGB. This shader writes gl_FragColor itself, and three only injects the
	// linear->sRGB output encode into its own materials' shaders — so tagging the
	// texture sRGB would decode on sample with nothing to re-encode, and every
	// photo would render markedly darker than the same file in an <img>.
	useMemo(() => {
		textures.forEach((texture) => {
			if (texture.colorSpace !== THREE.NoColorSpace) {
				texture.colorSpace = THREE.NoColorSpace;
				texture.needsUpdate = true;
			}
		});
	}, [textures]);

	// Create materials pool
	const materials = useMemo(
		() => Array.from({ length: visibleCount }, () => createClothMaterial()),
		[visibleCount]
	);

	useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

	const spatialPositions = useMemo(() => {
		const positions: { x: number; y: number }[] = [];
		const maxHorizontalOffset = MAX_HORIZONTAL_OFFSET;
		const maxVerticalOffset = MAX_VERTICAL_OFFSET;

		for (let i = 0; i < visibleCount; i++) {
			// Create varied distribution patterns for both axes
			const horizontalAngle = (i * 2.618) % (Math.PI * 2); // Golden angle for natural distribution
			const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2); // Offset angle for vertical

			const horizontalRadius = (i % 3) * 1.2; // Vary the distance from center
			const verticalRadius = ((i + 1) % 4) * 0.8; // Different pattern for vertical

			const x =
				(Math.sin(horizontalAngle) * horizontalRadius * maxHorizontalOffset) /
				3;
			const y =
				(Math.cos(verticalAngle) * verticalRadius * maxVerticalOffset) / 4;

			positions.push({ x, y });
		}

		return positions;
	}, [visibleCount]);

	const totalImages = normalizedImages.length;
	const depthRange = DEFAULT_DEPTH_RANGE;

	// Initialize plane data
	const planesData = useRef<PlaneData[]>(
		Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0, // Use spatial positions for x
			y: spatialPositions[i]?.y ?? 0, // Use spatial positions for y
		}))
	);

	useEffect(() => {
		planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z:
				visibleCount > 0
					? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange
					: 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0,
			y: spatialPositions[i]?.y ?? 0,
		}));
	}, [depthRange, spatialPositions, totalImages, visibleCount]);

	// Handle scroll input
	const handleWheel = useCallback(
		(event: WheelEvent) => {
			event.preventDefault();
			scrollVelocity.current += event.deltaY * 0.01 * speed;
			setAutoPlay(false);
			lastInteraction.current = performance.now();
		},
		[speed]
	);

	// Handle keyboard input
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
				scrollVelocity.current -= 2 * speed;
				setAutoPlay(false);
				lastInteraction.current = performance.now();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
				scrollVelocity.current += 2 * speed;
				setAutoPlay(false);
				lastInteraction.current = performance.now();
			}
		},
		[speed]
	);

	useEffect(() => {
		if (scrollMode !== 'canvas' || !glCanvas) return;

		glCanvas.addEventListener('wheel', handleWheel, { passive: false });
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			glCanvas.removeEventListener('wheel', handleWheel);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [glCanvas, scrollMode, handleWheel, handleKeyDown]);

	// Page-scroll mode: read the document's scroll delta instead of capturing the
	// wheel, so the page keeps scrolling normally past the gallery.
	useEffect(() => {
		if (scrollMode !== 'page') return;

		let lastY = window.scrollY;
		const handleScroll = () => {
			const delta = window.scrollY - lastY;
			lastY = window.scrollY;
			scrollVelocity.current += delta * 0.02 * speed;
			setAutoPlay(false);
			lastInteraction.current = performance.now();
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, [scrollMode, speed]);

	// Auto-play logic
	useEffect(() => {
		if (scrollMode === 'progress') return;

		const interval = setInterval(() => {
			if (performance.now() - lastInteraction.current > 3000) {
				setAutoPlay(true);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [scrollMode]);

	useFrame((state, delta) => {
		const scrubbed = scrollMode === 'progress' && !!progressRef;

		if (scrubbed) {
			const progress = Math.max(0, Math.min(1, progressRef.current));

			// Any real movement of the scroll resets the idle timer; once the timer
			// clears the delay the gallery keeps pulling photos inward by itself.
			if (Math.abs(progress - lastProgress.current) > 1e-5) {
				idleTime.current = 0;
			} else {
				idleTime.current += delta;
			}
			lastProgress.current = progress;

			if (idleTime.current > idleDelay) {
				idleOffset.current += idleSpeed * delta;
			}

			// Exponential ease toward the target. Framed as 1 - e^(-k*dt) so the
			// feel stays identical whatever the frame rate, and so the gallery
			// carries on easing for a beat after the scroll stops.
			const target = progress + idleOffset.current;
			const previous = smoothProgress.current;
			smoothProgress.current +=
				(target - previous) * (1 - Math.exp(-progressSmoothing * delta));

			// The cloth curve reads how fast the *rendered* value is moving, so it
			// relaxes on the same rubber-band curve as the photos.
			const rate = delta > 0 ? (smoothProgress.current - previous) / delta : 0;
			scrollVelocity.current += (rate * 2 - scrollVelocity.current) * 0.15;
		} else {
			// Apply auto-play
			if (autoPlay) {
				scrollVelocity.current += 0.3 * delta;
			}

			// Damping
			scrollVelocity.current *= 0.95;
		}

		const velocity = scrollVelocity.current;

		// Update time uniform for all materials
		const time = state.clock.getElapsedTime();
		materials.forEach((material) => {
			if (material && material.uniforms) {
				material.uniforms.time.value = time;
				material.uniforms.scrollForce.value = velocity;
			}
		});

		// Update plane positions
		const imageAdvance =
			totalImages > 0 ? visibleCount % totalImages || totalImages : 0;
		const totalRange = depthRange;

		planesData.current.forEach((plane, i) => {
			if (scrubbed) {
				// Depth is a pure function of progress, so scrolling back up rewinds
				// to exactly the frame you came from — no accumulated drift.
				const baseZ = (totalRange / Math.max(visibleCount, 1)) * i;
				const travelled =
					baseZ + smoothProgress.current * totalRange * progressCycles;
				const wraps = Math.floor(travelled / totalRange);

				plane.z = travelled - wraps * totalRange;

				if (totalImages > 0 && imageAdvance > 0) {
					const step = (i % totalImages) + wraps * imageAdvance;
					plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
				}
			} else {
				let newZ = plane.z + velocity * delta * 10;
				let wrapsForward = 0;
				let wrapsBackward = 0;

				if (newZ >= totalRange) {
					wrapsForward = Math.floor(newZ / totalRange);
					newZ -= totalRange * wrapsForward;
				} else if (newZ < 0) {
					wrapsBackward = Math.ceil(-newZ / totalRange);
					newZ += totalRange * wrapsBackward;
				}

				if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
					plane.imageIndex =
						(plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
				}

				if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
					const step = plane.imageIndex - wrapsBackward * imageAdvance;
					plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
				}

				plane.z = ((newZ % totalRange) + totalRange) % totalRange;
			}

			plane.x = spatialPositions[i]?.x ?? 0;
			plane.y = spatialPositions[i]?.y ?? 0;

			// Calculate opacity based on fade settings
			const normalizedPosition = plane.z / totalRange; // 0 to 1
			let opacity = 1;

			if (
				normalizedPosition >= fadeSettings.fadeIn.start &&
				normalizedPosition <= fadeSettings.fadeIn.end
			) {
				// Fade in: opacity goes from 0 to 1 within the fade in range
				const fadeInProgress =
					(normalizedPosition - fadeSettings.fadeIn.start) /
					(fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
				opacity = fadeInProgress;
			} else if (normalizedPosition < fadeSettings.fadeIn.start) {
				// Before fade in starts: fully transparent
				opacity = 0;
			} else if (
				normalizedPosition >= fadeSettings.fadeOut.start &&
				normalizedPosition <= fadeSettings.fadeOut.end
			) {
				// Fade out: opacity goes from 1 to 0 within the fade out range
				const fadeOutProgress =
					(normalizedPosition - fadeSettings.fadeOut.start) /
					(fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
				opacity = 1 - fadeOutProgress;
			} else if (normalizedPosition > fadeSettings.fadeOut.end) {
				// After fade out ends: fully transparent
				opacity = 0;
			}

			// Clamp opacity between 0 and 1
			opacity = Math.max(0, Math.min(1, opacity));

			// Calculate blur based on blur settings
			let blur = 0;

			if (
				normalizedPosition >= blurSettings.blurIn.start &&
				normalizedPosition <= blurSettings.blurIn.end
			) {
				// Blur in: blur goes from maxBlur to 0 within the blur in range
				const blurInProgress =
					(normalizedPosition - blurSettings.blurIn.start) /
					(blurSettings.blurIn.end - blurSettings.blurIn.start);
				blur = blurSettings.maxBlur * (1 - blurInProgress);
			} else if (normalizedPosition < blurSettings.blurIn.start) {
				// Before blur in starts: full blur
				blur = blurSettings.maxBlur;
			} else if (
				normalizedPosition >= blurSettings.blurOut.start &&
				normalizedPosition <= blurSettings.blurOut.end
			) {
				// Blur out: blur goes from 0 to maxBlur within the blur out range
				const blurOutProgress =
					(normalizedPosition - blurSettings.blurOut.start) /
					(blurSettings.blurOut.end - blurSettings.blurOut.start);
				blur = blurSettings.maxBlur * blurOutProgress;
			} else if (normalizedPosition > blurSettings.blurOut.end) {
				// After blur out ends: full blur
				blur = blurSettings.maxBlur;
			}

			// Clamp blur to reasonable values
			blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

			// Update material uniforms
			const material = materials[i];
			if (material && material.uniforms) {
				material.uniforms.opacity.value = opacity;
				material.uniforms.blurAmount.value = blur;
			}

			// Push the frame's position straight onto the mesh. The meshes mount
			// once and are moved imperatively, so nothing re-renders while the
			// gallery is in motion.
			const mesh = meshRefs.current[i];
			if (mesh && material) {
				mesh.position.set(plane.x, plane.y, plane.z - totalRange / 2);

				// A plane that wrapped past the end of the depth range is showing the
				// next photo in the loop, so swap its texture (and re-fit the plane to
				// that photo's aspect ratio) here rather than through a re-render.
				const texture = textures[plane.imageIndex];
				if (texture && material.uniforms.map.value !== texture) {
					material.uniforms.map.value = texture;

					const aspect = textureAspect(texture);
					if (aspect > 1) mesh.scale.set(2 * aspect, 2, 1);
					else mesh.scale.set(2, 2 / aspect, 1);
				}
			}
		});
	});

	if (normalizedImages.length === 0) return null;

	return (
		<>
			{planesData.current.map((plane, i) => {
				const texture = textures[plane.imageIndex];
				const material = materials[i];

				if (!texture || !material) return null;

				const worldZ = plane.z - depthRange / 2;

				// Calculate scale to maintain aspect ratio
				const aspect = textureAspect(texture);
				const scale: [number, number, number] =
					aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];

				return (
					<ImagePlane
						key={plane.index}
						texture={texture}
						position={[plane.x, plane.y, worldZ]} // Position planes relative to camera center
						scale={scale}
						material={material}
						onMesh={(node) => {
							meshRefs.current[i] = node;
						}}
					/>
				);
			})}
		</>
	);
}

// Fallback component for when WebGL is not available
function FallbackGallery({ images }: { images: ImageItem[] }) {
	const normalizedImages = useMemo(
		() =>
			images.map((img) =>
				typeof img === 'string' ? { src: img, alt: '' } : img
			),
		[images]
	);

	return (
		<div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
			<p className="text-gray-600 mb-4">
				WebGL not supported. Showing image list:
			</p>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
				{normalizedImages.map((img, i) => (
					<img
						key={i}
						src={img.src || '/placeholder.svg'}
						alt={img.alt}
						className="w-full h-32 object-cover rounded"
					/>
				))}
			</div>
		</div>
	);
}

export default function InfiniteGallery({
	images,
	speed,
	visibleCount,
	scrollMode = 'canvas',
	progressRef,
	progressCycles,
	progressSmoothing,
	idleDelay,
	idleSpeed,
	className = 'h-96 w-full',
	style,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.25 },
		fadeOut: { start: 0.4, end: 0.43 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.4, end: 0.43 },
		maxBlur: 8.0,
	},
}: InfiniteGalleryProps) {
	const [webglSupported, setWebglSupported] = useState(true);

	useEffect(() => {
		// Check WebGL support
		try {
			const canvas = document.createElement('canvas');
			const gl =
				canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) {
				setWebglSupported(false);
			}
		} catch {
			setWebglSupported(false);
		}
	}, []);

	if (!webglSupported) {
		return (
			<div className={className} style={style}>
				<FallbackGallery images={images} />
			</div>
		);
	}

	return (
		<div className={className} style={style}>
			<Canvas
				camera={{ position: [0, 0, 0], fov: 55 }}
				gl={{ antialias: true, alpha: true }}
			>
				<Suspense fallback={null}>
					<GalleryScene
						images={images}
						speed={speed}
						visibleCount={visibleCount}
						scrollMode={scrollMode}
						progressRef={progressRef}
						progressCycles={progressCycles}
						progressSmoothing={progressSmoothing}
						idleDelay={idleDelay}
						idleSpeed={idleSpeed}
						fadeSettings={fadeSettings}
						blurSettings={blurSettings}
					/>
				</Suspense>
			</Canvas>
		</div>
	);
}
