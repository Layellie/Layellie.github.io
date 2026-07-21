import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import visuals from "../../src/content/visuals.json";
import MockupRenderer from "../../src/components/project-visuals/MockupRenderer.jsx";

const preset = visuals.presets.find((item) => item.id === "eyehealth");
createRoot(document.getElementById("root")).render(<MockupRenderer preset={preset} lang="tr" />);
