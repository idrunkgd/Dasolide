"use client";

import * as React from "react";

/**
 * Silhouettes dessinées à la main (§15).
 *
 * Chaque groupe musculaire est un `<path>` / `<ellipse>` portant
 * `data-muscle="<slug>"`. Seule la moitié gauche est décrite : la moitié droite
 * est le même groupe, miroir. Le clic est délégué au `<svg>`, ce qui gère
 * naturellement les deux côtés.
 */

const BASE_FILL = "var(--surface-2)";
const BASE_STROKE = "var(--border-strong)";

type ShapeProps = { slug: string; d: string };

const FRONT_MUSCLES: ShapeProps[] = [
  // Épaules
  { slug: "deltoide-anterieur", d: "M63,66 C56,68 54,76 55,85 C56,93 61,97 67,95 C72,93 74,87 74,79 C73,71 69,65 63,66 Z" },
  { slug: "deltoide-lateral", d: "M56,71 C48,76 44,85 43,95 C42,103 47,108 52,105 C57,102 59,94 59,85 C59,78 58,73 56,71 Z" },
  // Poitrine
  { slug: "pectoraux", d: "M74,79 C85,74 95,76 97,80 L97,113 C94,120 83,122 76,117 C68,110 67,87 74,79 Z" },
  // Bras
  { slug: "biceps", d: "M58,92 C51,96 47,108 45,122 C44,131 47,137 53,137 C58,137 61,131 62,122 L64,101 C64,95 62,91 58,92 Z" },
  { slug: "avant-bras", d: "M42,148 C36,152 34,161 35,172 L38,197 C39,204 43,208 48,206 C52,204 53,198 52,191 L51,164 C50,154 47,147 42,148 Z" },
  // Tronc
  { slug: "grand-droit", d: "M84,123 L97,123 L97,177 L88,177 C84,171 82,161 82,147 C82,136 83,127 84,123 Z" },
  { slug: "obliques", d: "M77,126 C82,124 83,136 83,150 C83,164 81,173 77,178 C72,172 71,136 77,126 Z" },
  // Jambes
  { slug: "quadriceps", d: "M80,224 C73,245 72,269 76,293 L92,293 C93,269 93,245 92,224 Z" },
  { slug: "adducteurs", d: "M93,224 L98,224 L98,280 C95,277 93,269 93,257 Z" },
  { slug: "mollets", d: "M78,314 C74,328 75,348 80,360 C87,363 92,354 92,340 C92,327 90,318 88,312 Z" },
];

const BACK_MUSCLES: ShapeProps[] = [
  { slug: "trapezes", d: "M97,61 L83,66 C75,71 72,82 75,94 C77,104 84,112 91,118 L97,122 Z" },
  { slug: "deltoide-posterieur", d: "M63,66 C56,69 53,78 54,87 C55,95 61,98 67,96 C72,94 74,87 74,79 C73,71 69,65 63,66 Z" },
  { slug: "deltoide-lateral", d: "M56,71 C48,76 44,85 43,95 C42,103 47,108 52,105 C57,102 59,94 59,85 C59,78 58,73 56,71 Z" },
  { slug: "grand-dorsal", d: "M79,104 C70,117 70,142 77,159 L97,150 L97,100 C91,105 85,107 79,104 Z" },
  { slug: "triceps", d: "M58,90 C51,95 47,108 45,123 C44,132 47,138 53,138 C58,138 61,131 62,122 L64,100 C64,93 62,89 58,90 Z" },
  { slug: "avant-bras", d: "M42,148 C36,152 34,161 35,172 L38,197 C39,204 43,208 48,206 C52,204 53,198 52,191 L51,164 C50,154 47,147 42,148 Z" },
  { slug: "erecteurs-du-rachis", d: "M89,124 L97,124 L97,177 L87,177 C84,164 85,139 89,124 Z" },
  { slug: "fessiers", d: "M80,181 C71,189 70,207 79,215 C89,221 97,214 97,201 L97,179 Z" },
  { slug: "ischio-jambiers", d: "M80,224 C73,246 72,270 76,293 L94,293 C96,270 96,246 95,224 Z" },
  { slug: "mollets", d: "M78,310 C74,326 75,348 81,359 C89,362 93,352 93,338 C93,324 91,314 89,308 Z" },
];

/** Bras, jambes, mains, pieds — moitié gauche, sans muscle attaché. */
const BASE_HALF: string[] = [
  // bras
  "M61,67 C51,70 45,79 43,91 L38,133 C37,141 41,148 47,148 C53,149 58,144 59,136 L65,93 C66,81 65,70 61,67 Z",
  "M41,146 C35,151 32,159 33,169 L36,201 C37,209 41,213 46,212 C51,211 54,206 53,198 L52,161 C51,151 47,145 41,146 Z",
  // main
  "M38,208 C44,205 51,207 53,213 C55,220 52,228 46,229 C40,230 35,225 35,218 C35,213 36,210 38,208 Z",
  // cuisse
  "M78,220 C71,241 69,269 73,297 L96,297 C98,269 98,241 97,220 Z",
  // genou
  "M74,296 C81,292 90,293 94,297 C97,301 96,308 91,310 C84,313 77,311 74,307 C72,304 72,298 74,296 Z",
  // tibia
  "M75,308 C72,333 73,361 78,387 L94,387 C95,361 95,333 94,308 Z",
  // pied
  "M76,384 L94,384 L95,399 C95,404 89,407 83,407 L78,407 C74,407 73,403 74,397 Z",
];

/** Tête, cou, tronc — symétriques, dessinés une seule fois. */
function BaseCenter() {
  return (
    <g fill={BASE_FILL} stroke={BASE_STROKE} strokeWidth="1">
      <ellipse cx="100" cy="32" rx="17" ry="21" />
      <path d="M91,49 h18 v11 c0,4 -4,7 -9,7 s-9,-3 -9,-7 z" />
      <path d="M62,66 C56,68 54,75 56,84 L66,134 C69,150 74,160 76,179 L124,179 C126,160 131,150 134,134 L144,84 C146,75 144,68 138,66 C126,61 116,59 100,59 C84,59 74,61 62,66 Z" />
      <path d="M76,179 L124,179 L119,209 C115,218 108,223 100,223 C92,223 85,218 81,209 Z" />
    </g>
  );
}

export function BodyMap({
  view,
  fillFor,
  onSelect,
  selected,
  width = 340,
}: {
  view: "avant" | "arriere";
  fillFor: (shape: string) => string;
  onSelect: (shape: string) => void;
  selected?: string | null;
  width?: number;
}) {
  const muscles = view === "avant" ? FRONT_MUSCLES : BACK_MUSCLES;

  const handle = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    const slug = target.getAttribute?.("data-muscle");
    if (slug) onSelect(slug);
  };

  const half = (
    <g>
      {muscles.map((m, i) => (
        <path
          key={`${m.slug}-${i}`}
          data-muscle={m.slug}
          d={m.d}
          fill={fillFor(m.slug)}
          stroke={selected === m.slug ? "var(--accent)" : "var(--border)"}
          strokeWidth={selected === m.slug ? 2 : 0.8}
          style={{ cursor: "pointer", transition: "fill 200ms ease" }}
        />
      ))}
    </g>
  );

  return (
    <svg
      viewBox="0 0 200 420"
      width={width}
      height={(width * 420) / 200}
      onClick={handle}
      role="img"
      aria-label={view === "avant" ? "Silhouette vue de face" : "Silhouette vue de dos"}
      className="max-w-full"
    >
      <g fill={BASE_FILL} stroke={BASE_STROKE} strokeWidth="1">
        {BASE_HALF.map((d, i) => (
          <path key={`bl-${i}`} d={d} />
        ))}
      </g>
      <g fill={BASE_FILL} stroke={BASE_STROKE} strokeWidth="1" transform="translate(200,0) scale(-1,1)">
        {BASE_HALF.map((d, i) => (
          <path key={`br-${i}`} d={d} />
        ))}
      </g>
      <BaseCenter />
      {half}
      <g transform="translate(200,0) scale(-1,1)">{half}</g>
      {/* Repères anatomiques : sangle abdominale à l'avant, colonne à l'arrière */}
      {view === "avant" ? (
        <g stroke="var(--bg)" strokeWidth="1.4" opacity="0.55">
          <line x1="100" y1="120" x2="100" y2="178" />
          <line x1="84" y1="141" x2="116" y2="141" />
          <line x1="84" y1="159" x2="116" y2="159" />
        </g>
      ) : (
        <line x1="100" y1="66" x2="100" y2="178" stroke="var(--bg)" strokeWidth="1.4" opacity="0.55" />
      )}
    </svg>
  );
}
