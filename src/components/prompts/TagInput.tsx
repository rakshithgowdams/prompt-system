import { useState, KeyboardEvent } from 'react';
import { TagChip } from '../ui/Badge';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const tag = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink-700">Tags</label>
      <div className="min-h-[2.75rem] px-3 py-2 rounded-md bg-white border border-ink-300 hover:border-ink-500 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-colors flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <TagChip key={tag} tag={tag} onRemove={() => onChange(tags.filter((t) => t !== tag))} />
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? 'Add tags (press Enter)' : ''}
          className="flex-1 min-w-24 bg-transparent text-ink-900 text-sm placeholder-ink-400 focus:outline-none"
        />
      </div>
      <p className="text-xs text-ink-500">Press Enter or comma to add a tag</p>
    </div>
  );
}
