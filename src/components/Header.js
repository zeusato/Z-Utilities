import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
// import QuickTranslateButton from "../Tools/Buttons/QuickTranslateButton";
import XChangeButton from "../Tools/Buttons/XChangeButton";
import WeatherButton from "../Tools/Buttons/WeatherButton";
import LOGO from "../../img/Logo.png";
export default function Header() {
    return (_jsx("header", { className: "sticky top-0 z-40", children: _jsx("div", { className: "\n                  px-4 md:px-6 py-3 transition\n                  bg-transparent backdrop-blur-0 border-transparent\n                  hover:bg-white/15 hover:backdrop-blur-md hover:border-white/30\n                  focus-within:bg-white/5 focus-within:backdrop-blur-md focus-within:border-white/5\n                  ", children: _jsxs("div", { className: "max-w-6xl mx-auto flex items-center gap-3", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-2", children: [_jsx("img", { src: LOGO, alt: "Zeusato", className: "h-10 w-auto mt-1 mb-1" }), _jsx("span", { className: "font-bold tracking-wide", children: "Utilities" })] }), _jsxs("nav", { className: "ml-auto flex items-center gap-3", children: [_jsx(XChangeButton, { label: "XChange", portalSelector: "body" }), _jsx(WeatherButton, { label: "Th\u1EDDi ti\u1EBFt", portalSelector: "body" })] })] }) }) }));
}
