/**
 * @file        EditorToolbar component
 * @description Toolbar for the rich text editor
 */

import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
      <div className={styles.group}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.btn} ${editor.isActive('bold') ? styles.active : ''}`}
          title="Bold"
          aria-pressed={editor.isActive('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.btn} ${editor.isActive('italic') ? styles.active : ''}`}
          title="Italic"
          aria-pressed={editor.isActive('italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.btn} ${editor.isActive('underline') ? styles.active : ''}`}
          title="Underline"
          aria-pressed={editor.isActive('underline')}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${styles.btn} ${editor.isActive('strike') ? styles.active : ''}`}
          title="Strikethrough"
          aria-pressed={editor.isActive('strike')}
        >
          <s>S</s>
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.btn} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
          title="Heading 2"
          aria-pressed={editor.isActive('heading', { level: 2 })}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${styles.btn} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
          title="Heading 3"
          aria-pressed={editor.isActive('heading', { level: 3 })}
        >
          H3
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.btn} ${editor.isActive('bulletList') ? styles.active : ''}`}
          title="Bullet list"
          aria-pressed={editor.isActive('bulletList')}
        >
          &#8226;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.btn} ${editor.isActive('orderedList') ? styles.active : ''}`}
          title="Numbered list"
          aria-pressed={editor.isActive('orderedList')}
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${styles.btn} ${editor.isActive('blockquote') ? styles.active : ''}`}
          title="Blockquote"
          aria-pressed={editor.isActive('blockquote')}
        >
          &#10078;
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <button
          type="button"
          onClick={addLink}
          className={`${styles.btn} ${editor.isActive('link') ? styles.active : ''}`}
          title="Insert link"
          aria-pressed={editor.isActive('link')}
        >
          &#128279;
        </button>
        <button
          type="button"
          onClick={addImage}
          className={styles.btn}
          title="Insert image"
        >
          &#128247;
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${styles.btn} ${editor.isActive('code') ? styles.active : ''}`}
          title="Inline code"
          aria-pressed={editor.isActive('code')}
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${styles.btn} ${editor.isActive('codeBlock') ? styles.active : ''}`}
          title="Code block"
          aria-pressed={editor.isActive('codeBlock')}
        >
          &#9114;
        </button>
      </div>
    </div>
  );
}
