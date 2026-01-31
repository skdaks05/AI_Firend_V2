import * as p from "@clack/prompts";
import pc from "picocolors";
import { join } from "node:path";
import { installSkill, installShared, PRESETS, getAllSkills } from "../lib/skills.js";

export async function install(): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-ag ")));

  const projectType = await p.select({
    message: "What type of project?",
    options: [
      { value: "all", label: "✨ All", hint: "Install everything" },
      { value: "fullstack", label: "🌐 Fullstack", hint: "Frontend + Backend + PM + QA" },
      { value: "frontend", label: "🎨 Frontend", hint: "React/Next.js" },
      { value: "backend", label: "⚙️ Backend", hint: "FastAPI/Python" },
      { value: "mobile", label: "📱 Mobile", hint: "Flutter/Dart" },
      { value: "custom", label: "🔧 Custom", hint: "Choose skills" },
    ],
  });

  if (p.isCancel(projectType)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  let selectedSkills: string[];

  if (projectType === "custom") {
    const allSkills = getAllSkills();
    const selected = await p.multiselect({
      message: "Select skills:",
      options: allSkills.map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.desc,
      })),
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    selectedSkills = selected as string[];
  } else {
    selectedSkills = PRESETS[projectType as string] ?? [];
  }

  const cwd = process.cwd();
  const spinner = p.spinner();
  spinner.start("Installing skills...");

  try {
    await installShared(cwd);

    for (const skillName of selectedSkills) {
      spinner.message(`Installing ${pc.cyan(skillName)}...`);
      await installSkill(skillName, cwd);
    }

    spinner.stop("Skills installed!");

    p.note(
      [
        ...selectedSkills.map((s) => `${pc.green("✓")} ${s}`),
        "",
        pc.dim(`Location: ${join(cwd, ".agent", "skills")}`),
      ].join("\n"),
      "Installed"
    );

    p.outro(pc.green("Done! Open your project in your IDE to use the skills."));

    p.note(
      `${pc.yellow("❤️")} Enjoying oh-my-ag? Give it a star!\n${pc.dim("gh api --method PUT /user/starred/first-fluke/oh-my-ag")}`,
      "Support"
    );
  } catch (error) {
    spinner.stop("Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
