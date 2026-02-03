/**
 * @file        RichTextEditor component
 * @description TipTap-based rich text editor for question content
 */

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorToolbar } from './EditorToolbar';
import { sanitizeHtml } from '@/utils/sanitize';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className = '',
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      if (!isInternalUpdate.current) {
        const rawHtml = e.getHTML();
        const sanitized = sanitizeHtml(rawHtml);
        onChange(sanitized);
      }
    },
    editorProps: {
      attributes: {
        class: styles.editorContent ?? '',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isInternalUpdate.current = true;
      editor.commands.setContent(content);
      isInternalUpdate.current = false;
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`${styles.editor} ${className}`}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
