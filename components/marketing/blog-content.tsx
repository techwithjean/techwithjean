import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Renders a blog post's markdown body with themed styling. Kept dependency-light
 * (no typography plugin) by mapping each element to design-token classes.
 */
export function BlogContent({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-6 font-heading text-2xl font-bold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-pretty">{children}</p>,
          ul: ({ children }) => (
            <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-brand-orange">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-2 pl-6 marker:text-brand-orange">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
