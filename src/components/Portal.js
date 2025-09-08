import { createPortal } from "react-dom";
export default function Portal({ children, selector = "#z-portal" }) {
    if (typeof document === "undefined")
        return null;
    let container;
    if (selector === "body") {
        container = document.body;
    }
    else {
        container = document.querySelector(selector);
        if (!container) {
            container = document.createElement("div");
            if (selector.startsWith("#"))
                container.id = selector.slice(1);
            container.setAttribute("data-portal", "true");
            document.body.appendChild(container);
        }
    }
    return createPortal(children, container);
}
