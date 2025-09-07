import React from "react";
import { createPortal } from "react-dom";

type PortalProps = {
  children: React.ReactNode;
  /** CSS selector của nơi sẽ gắn portal. Mặc định: '#z-portal' (auto tạo dưới body) */
  selector?: string; // 'body' | '#workspace-root' | ...
};

export default function Portal({ children, selector = "#z-portal" }: PortalProps) {
  if (typeof document === "undefined") return null;

  let container: HTMLElement | null;
  if (selector === "body") {
    container = document.body;
  } else {
    container = document.querySelector(selector) as HTMLElement | null;
    if (!container) {
      container = document.createElement("div");
      if (selector.startsWith("#")) container.id = selector.slice(1);
      container.setAttribute("data-portal", "true");
      document.body.appendChild(container);
    }
  }
  return createPortal(children, container);
}
