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
      <label className="text-sm font-medium text-gray-300">Tags</label>
      <div className="min-h-[2.75rem] px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition-colors flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <TagChip key={tag} tag={tag} onRemove={() => onChange(tags.filter((t) => t !== tag))} />
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? 'Add tags (press Enter)' : ''}
          className="flex-1 min-w-24 bg-transparent text-gray-100 text-sm placeholder-gray-500 focus:outline-none"
        />
      </div>
      <p className="text-xs text-gray-500">Press Enter or comma to add a tag</p>
    </div>
  );
}
