import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, ArrowRight } from 'lucide-react';
import { Reveal } from './motion';

const COURSES = [
  {
    title: 'Mastering Midjourney v6',
    instructor: 'Rakshith A',
    level: 'Beginner',
    rating: 4.9,
    students: 1240,
    hours: 4.5,
    color: 'from-brand-400 to-pink-500',
  },
  {
    title: 'ChatGPT for Productivity',
    instructor: 'Priya Menon',
    level: 'All levels',
    rating: 4.8,
    students: 980,
    hours: 3,
    color: 'from-blue-400 to-cyan-500',
  },
  {
    title: 'AI Illustration Mastery',
    instructor: 'Arjun Nair',
    level: 'Intermediate',
    rating: 4.7,
    students: 720,
    hours: 6,
    color: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Build Your AI Workflow',
    instructor: 'Meera Joshi',
    level: 'Advanced',
    rating: 4.9,
    students: 540,
    hours: 5,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    title: 'Prompt Engineering 101',
    instructor: 'Vikram Patel',
    level: 'Beginner',
    rating: 4.6,
    students: 2100,
    hours: 2.5,
    color: 'from-violet-400 to-brand-500',
  },
  {
    title: 'Stable Diffusion Deep Dive',
    instructor: 'Sneha Reddy',
    level: 'Intermediate',
    rating: 4.8,
    students: 630,
    hours: 7,
    color: 'from-rose-400 to-pink-500',
  },
  {
    title: 'LLMs from Scratch',
    instructor: 'Rohan Gupta',
    level: 'Advanced',
    rating: 4.7,
    students: 410,
    hours: 8,
    color: 'from-slate-500 to-ink-700',
  },
  {
    title: 'AI Content Creation',
    instructor: 'Karthik Iyer',
    level: 'All levels',
    rating: 4.9,
    students: 1580,
    hours: 3.5,
    color: 'from-sky-400 to-blue-500',
  },
];

function CourseCard({ course }: { course: typeof COURSES[0] }) {
  return (
    <div className="flex-shrink-0 w-64 bg-white border border-ink-300 rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300 group">
      <div className={`h-36 bg-gradient-to-br ${course.color} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <span className="relative z-10 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
          FREE
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full">
            {course.level}
          </span>
          <div className="flex items-center gap-1 text-xs font-semibold text-rating">
            <Star className="w-3 h-3 fill-current" />
            {course.rating}
          </div>
        </div>
        <h3 className="font-display font-bold text-sm text-ink-900 leading-snug mb-1 line-clamp-2 group-hover:text-brand-500 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-ink-500 mb-3">{course.instructor}</p>
        <div className="flex items-center justify-between text-xs text-ink-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {course.hours}h
          </div>
          <span>{course.students.toLocaleString('en-IN')} students</span>
        </div>
      </div>
    </div>
  );
}

export function CoursesPreview() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section id="courses" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
                Learn with the community
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight leading-tight">
                Courses that actually{' '}
                <em className="font-serif italic font-medium text-brand-400">finish</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <Link
              to="/signup"
              className="flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors flex-shrink-0"
            >
              View all courses
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 px-6 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {COURSES.map((course) => (
          <div key={course.title} className="snap-start">
            <CourseCard course={course} />
          </div>
        ))}
        {/* CTA card at the end */}
        <div className="flex-shrink-0 w-64 bg-ink-900 rounded-2xl overflow-hidden flex items-center justify-center snap-start">
          <Link
            to="/signup"
            className="flex flex-col items-center gap-3 p-8 text-center text-white hover:text-brand-300 transition-colors"
          >
            <ArrowRight className="w-8 h-8" />
            <span className="font-display font-bold text-sm">Build your own course</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
