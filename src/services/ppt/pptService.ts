import pptxgen from "pptxgenjs";
import { DEFAULT_STYLE, PPTStyle } from "./pptConfig";

/**
 * PPT Generation Service
 * Converts Markdown content to professional PowerPoint slides
 */

export const generatePPTFromMarkdown = async (
  title: string,
  markdown: string,
  style: PPTStyle = DEFAULT_STYLE
) => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";

  // 1. Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: style.colors.primary };
  
  titleSlide.addText(title, {
    x: 1,
    y: 2,
    w: "80%",
    h: 1.5,
    fontSize: 44,
    color: "FFFFFF",
    bold: true,
    fontFace: style.fonts.heading,
    align: "center"
  });

  titleSlide.addText("咨询调研与分析报告", {
    x: 1,
    y: 3.5,
    w: "80%",
    h: 0.5,
    fontSize: 18,
    color: "FFFFFF",
    fontFace: style.fonts.body,
    align: "center"
  });

  // 2. Content Slides
  // Split by H2 headers (##)
  const sections = markdown.split(/\n##\s+/);
  
  // Skip first part if it's empty or just H1
  const contentSections = sections.filter(s => s.trim().length > 0);

  contentSections.forEach((section) => {
    const lines = section.split("\n");
    const slideTitle = lines[0].trim().replace(/^#+\s+/, "");
    const slideContent = lines.slice(1).join("\n").trim();

    if (slideTitle) {
      const slide = pptx.addSlide();
      
      // Header Bar (Roland Berger style)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.8,
        fill: { color: style.colors.primary }
      });

      slide.addText(slideTitle, {
        x: 0.5,
        y: 0.15,
        w: "90%",
        h: 0.5,
        fontSize: 24,
        color: "FFFFFF",
        bold: true,
        fontFace: style.fonts.heading
      });

      // Body Content
      // Simple parsing of bullets and paragraphs
      const bodyLines = slideContent.split("\n").filter(l => l.trim().length > 0);
      let currentY = 1.2;

      bodyLines.forEach((line) => {
        const isBullet = line.trim().startsWith("-") || line.trim().startsWith("*");
        const cleanLine = line.trim().replace(/^[-*]\s+/, "");

        slide.addText(cleanLine, {
          x: 0.8,
          y: currentY,
          w: "85%",
          fontSize: isBullet ? 16 : 14,
          color: style.colors.text,
          bullet: isBullet ? { type: "bullet" } : undefined,
          fontFace: style.fonts.body,
          paraSpaceBefore: 0.1
        });

        // Estimate height (rough)
        const lineCount = Math.ceil(cleanLine.length / 60);
        currentY += 0.3 * lineCount + 0.1;
      });

      // Footer
      slide.addText("Roland Berger Style Consulting Report", {
        x: 0.5,
        y: 5.2,
        w: "50%",
        fontSize: 10,
        color: "999999",
        fontFace: style.fonts.body
      });
    }
  });

  // 3. Save the file
  const fileName = `${title.replace(/\s+/g, "_")}_Report.pptx`;
  await pptx.writeFile({ fileName });
};
