"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

interface DocsArticleProps {
  markdown: string;
}

export function DocsArticle({ markdown }: DocsArticleProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="prose prose-invert max-w-none prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/45 prose-code:rounded prose-code:bg-white/8 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-table:block prose-table:overflow-x-auto"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="mt-0 mb-5 text-4xl font-semibold tracking-tight text-zinc-50"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="mt-10 mb-4 scroll-mt-28 border-b border-white/10 pb-2 text-2xl font-semibold text-zinc-50"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="mt-8 mb-3 scroll-mt-28 text-xl font-semibold text-zinc-100"
              {...props}
            >
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="leading-7 text-zinc-300" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="space-y-1 text-zinc-300" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="space-y-1 text-zinc-300" {...props}>
              {children}
            </ol>
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="font-medium text-cyan-300 underline decoration-cyan-300/40 underline-offset-4"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-2 border-cyan-300/40 bg-cyan-500/5 px-4 py-2 text-zinc-200"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </motion.article>
  );
}
