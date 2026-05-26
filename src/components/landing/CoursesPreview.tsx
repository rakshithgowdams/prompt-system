import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Clock, ArrowRight } from 'lucide-react';
import { TiltCard, Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

const COURSES = [
  { title: 'Mastering Midjourney v6', instructor: 'Rakshith A', level: 'Beginner', rating: 4.9, students: 1240, hours: 4.5, color: 'from-brand-400 to-pink-500' },
  { title: 'ChatGPT for Productivity', instructor: 'Priya Menon', level: 'All levels', rating: 4.8, students: 980, hours: 3, color: 'from-blue-400 to-cyan-500' },
  { title: 'AI Illustration Mastery', instructor: 'Arjun Nair', level: 'Intermediate', rating: 4.7, students: 720, hours: 6, color: 'from-amber-400 to-orange-500' },
  { title: 'Build Your AI Workflow', instructor: 'Meera Joshi', level: 'Advanced', rating: 4.9, students: 540, hours: 5, color: 'from-emerald-400 to-teal-500' },
  { title: 'Prompt Engineering 101', instructor: 'Vikram Patel', level: 'Beginner', rating: 4.6, students: 2100, hours: 2.5, color: 'from-violet-400 to-brand-500' },
  { title: 'Stable Diffusion Deep Dive', instructor: 'Sneha Reddy', level: 'Intermediate', rating: 4.8, students: 630, hours: 7, color: 'from-rose-400 to-pink-500' },
  { title: 'LLMs from Scratch', instructor: 'Rohan Gupta', level: 'Advanced', rating: 4.7, students: 410, hours: 8, color: 'from-slate-500 to-ink-700' },
  { title: 'AI Content Creation', instructor: 'Karthik Iyer', level: 'All levels', rating: 4.9, students: 1580, hours: 3.5, color: 'from-sky-400 to-blue-500' },
];

function CourseCard({ course, index }: { course: typeof COURSES[0]; index: number }) {
  return (
    <TiltCard className="flex-shrink-0 w-[200px] sm:w-[220px] snap-start">
      <motion.div
        className="bg-white border border-ink-200 rounded-2xl overflow-hidden h-full shadow-sm"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -5, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.14)' }}
      >
        {/* Gradient thumbnail */}
        <div className={`h-[140px] sm:h-[150px] bg-gradient-to-br ${course.color} flex items-center justify-center relative overflow-hidden`}>
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.06, type: 'spring', stiffness: 400 }}
            className="relative z-10 bg-white/25 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide"
          >
            FREE
          </motion.span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6 }}
          />
        </div>
        {/* Card body */}
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-ink-500 bg-ink-100 px-2 py-0.5 rounded-md">
              {course.level}
            </span>
            <motion.div
              className="flex items-center gap-1 text-[11px] font-semibold text-rating"
              whileHover={{ scale: 1.1 }}
            >
              <Star className="w-3 h-3 fill-current" />
              {course.rating}
            </motion.div>
          </div>
          <h3 className="font-display font-bold text-[13px] text-ink-900 leading-snug mb-1 line-clamp-2">
            {course.title}
          </h3>
          <p className="text-[11px] text-ink-500 mb-3 leading-none">{course.instructor}</p>
          <div className="flex items-center justify-between text-[11px] text-ink-500 border-t border-ink-100 pt-2.5">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {course.hours}h
            </div>
            <span>{course.students.toLocaleString('en-IN')} students</span>
          </div>
        </div>
      </motion.div>
    </TiltCard>
  );
}

export function CoursesPreview() {
  const stripRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(headerRef.current!.children, {
        y: 40, opacity: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 85%', once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="courses" className="py-16 sm:py-24 bg-white">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
              Learn with the community
            </p>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight leading-tight">
              Courses that actually{' '}
              <em className="font-serif italic font-medium text-brand-400">finish</em>.
            </h2>
          </div>
          <motion.div whileHover={{ x: 4 }}>
            <Link
              to="/signup"
              className="flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors flex-shrink-0"
            >
              View all courses
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Strip: left edge aligns with header content, cards overflow right */}
      <div
        ref={stripRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory pl-4 sm:pl-6 lg:pl-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {COURSES.map((course, i) => (
          <CourseCard key={course.title} course={course} index={i} />
        ))}
        {/* CTA card */}
        <motion.div
          className="flex-shrink-0 w-48 sm:w-56 bg-ink-900 rounded-2xl overflow-hidden flex items-center justify-center snap-start mr-4 sm:mr-6 lg:mr-8"
          whileHover={{ scale: 1.03, backgroundColor: '#A435F0' }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/signup"
            className="flex flex-col items-center gap-3 p-8 text-center text-white"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight className="w-8 h-8" />
            </motion.div>
            <span className="font-display font-bold text-sm">Build your own course</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
