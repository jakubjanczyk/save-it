"use client";

import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function safeHref(href: string | undefined): string | undefined {
  if (!href) {
    return undefined;
  }

  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function BrowseMarkdown(props: { markdown: string }) {
  return (
    <div className="grid gap-3">
      <ReactMarkdown
        components={{
          a: ({ children, href, ...rest }) => {
            const safe = safeHref(href);
            if (!safe) {
              return <>{children}</>;
            }

            return (
              <a
                className="underline underline-offset-2"
                href={safe}
                rel="noreferrer noopener"
                target="_blank"
                {...rest}
              >
                {children}
              </a>
            );
          },
          code: ({ children, className, ...rest }: ComponentProps<"code">) => (
            <code
              className={
                className ?? "rounded bg-muted px-1 py-0.5 font-mono text-xs"
              }
              {...rest}
            >
              {children}
            </code>
          ),
          h1: ({ children, ...rest }) => (
            <h1 className="font-semibold text-base" {...rest}>
              {children}
            </h1>
          ),
          h2: ({ children, ...rest }) => (
            <h2 className="font-semibold text-sm" {...rest}>
              {children}
            </h2>
          ),
          h3: ({ children, ...rest }) => (
            <h3 className="font-medium text-sm" {...rest}>
              {children}
            </h3>
          ),
          li: ({ children, ...rest }) => (
            <li className="text-sm leading-relaxed" {...rest}>
              {children}
            </li>
          ),
          ol: ({ children, ...rest }) => (
            <ol className="list-inside list-decimal space-y-1" {...rest}>
              {children}
            </ol>
          ),
          p: ({ children, ...rest }) => (
            <p
              className="whitespace-pre-wrap text-sm leading-relaxed"
              {...rest}
            >
              {children}
            </p>
          ),
          pre: ({ children, ...rest }) => (
            <pre
              className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed"
              {...rest}
            >
              {children}
            </pre>
          ),
          ul: ({ children, ...rest }) => (
            <ul className="list-inside list-disc space-y-1" {...rest}>
              {children}
            </ul>
          ),
        }}
        remarkPlugins={[remarkGfm]}
        skipHtml={true}
      >
        {props.markdown}
      </ReactMarkdown>
    </div>
  );
}
