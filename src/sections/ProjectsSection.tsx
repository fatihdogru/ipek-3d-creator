import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import FadeIn from '../components/FadeIn';
import LiveProjectButton from '../components/LiveProjectButton';
import { useLanguage } from '../i18n/LanguageProvider';
import extractorsInterior from '../assets/works/01-scifi-interior.jpg';
import extractorsCave from '../assets/works/02-cave.jpg';
import extractorsOrbit from '../assets/works/05-orbit.jpg';

const CDN = 'https://images.higgs.ai/?default=1&output=webp&url=';
const BUCKET =
  'https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2F';
const SUFFIX = '&w=1280&q=85';

const img = (file: string) => `${CDN}${BUCKET}${file}${SUFFIX}`;

interface Project {
  number: string;
  name: string;
  category: string;
  images: [string, string, string];
}

const PROJECTS: Project[] = [
  {
    number: '01',
    name: 'The EXTRACTORS',
    category: 'Starry Games',
    images: [extractorsInterior, extractorsCave, extractorsOrbit],
  },
  {
    number: '02',
    name: 'Aura Brand Identity',
    category: 'Personal',
    images: [
      img('hf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png'),
      img('hf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png'),
      img('hf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png'),
    ],
  },
  {
    number: '03',
    name: 'Solaris Digital',
    category: 'Client',
    images: [
      img('hf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png'),
      img('hf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png'),
      img('hf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png'),
    ],
  },
];

const RADIUS = 'rounded-[40px] sm:rounded-[50px] md:rounded-[60px]';

interface ProjectCardProps {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
}

function ProjectCard({ project, index, total, progress }: ProjectCardProps) {
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div className="sticky top-24 flex h-[85vh] items-start justify-center md:top-32">
      <motion.article
        style={{ scale, top: `${index * 28}px` }}
        className={`relative w-full max-w-6xl border-2 border-[#D7E2EA] bg-black p-4 sm:p-6 md:p-8 ${RADIUS}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 pb-6 sm:px-4 md:pb-8">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <span
              className="hero-heading shrink-0 font-black leading-none"
              style={{ fontSize: 'clamp(3rem, 10vw, 140px)', minWidth: '1.3em' }}
            >
              {project.number}
            </span>
            <div className="flex flex-col gap-1 md:gap-2">
              <span
                className="font-light uppercase tracking-widest text-[#D7E2EA]/60"
                style={{ fontSize: 'clamp(0.7rem, 1.2vw, 1rem)' }}
              >
                {project.category}
              </span>
              <h3
                className="font-medium uppercase leading-tight text-[#D7E2EA]"
                style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)' }}
              >
                {project.name}
              </h3>
            </div>
          </div>

          <LiveProjectButton />
        </div>

        <div className="flex gap-3 sm:gap-4 md:gap-5">
          <div className="flex w-[40%] flex-col gap-3 sm:gap-4 md:gap-5">
            <div className={`overflow-hidden ${RADIUS}`} style={{ height: 'clamp(130px, 16vw, 230px)' }}>
              <img
                src={project.images[0]}
                alt={`${project.name} preview 1`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className={`overflow-hidden ${RADIUS}`} style={{ height: 'clamp(160px, 22vw, 340px)' }}>
              <img
                src={project.images[1]}
                alt={`${project.name} preview 2`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className={`w-[60%] overflow-hidden ${RADIUS}`}>
            <img
              src={project.images[2]}
              alt={`${project.name} preview 3`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default function ProjectsSection() {
  const { t } = useLanguage();
  const container = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      id="projects"
      ref={container}
      className="relative z-10 -mt-10 rounded-t-[40px] bg-black px-5 py-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-8 md:-mt-14 md:rounded-t-[60px] md:px-10"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading mb-16 text-center font-black uppercase leading-none tracking-tight sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          {t.projects.title}
        </h2>
      </FadeIn>

      {PROJECTS.map((project, i) => (
        <ProjectCard
          key={project.number}
          project={project}
          index={i}
          total={PROJECTS.length}
          progress={scrollYProgress}
        />
      ))}
    </section>
  );
}
