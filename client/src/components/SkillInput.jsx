import { useState } from 'react';
import { SkillChips } from './ui';

/** Tag-style input: type a skill and press Enter or comma to add it. */
export default function SkillInput({ value = [], onChange, placeholder = 'Type a skill and press Enter' }) {
  const [text, setText] = useState('');

  const add = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setText('');
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <input
        className="input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && text.trim()) {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => text.trim() && add(text)}
      />
      <SkillChips skills={value} empty="No skills added yet" onRemove={(s) => onChange(value.filter((v) => v !== s))} />
    </div>
  );
}
