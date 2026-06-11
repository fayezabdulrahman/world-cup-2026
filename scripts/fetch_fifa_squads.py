from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

from pypdf import PdfReader

PDF_URL = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf"
SOURCE_URL = (
    "https://inside.fifa.com/organisation/media-releases/"
    "world-cup-2026-48-squads-confirmed"
)

TEAM_RE = re.compile(r"([A-Za-zÀ-ÿ'’.,\- ]+)\s+\(([A-Z]{3})\)")
PLAYER_RE = re.compile(
    r"^\s*(\d{1,2})\s*(GK|DF|MF|FW)\s+(.*?)(\d{2}/\d{2}/\d{4})(.*?)\s+(\d{3})\s*$"
)


def normalize_text(value: str) -> str:
    cleaned = value.replace("\x00", "").replace("™", "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\b([A-ZÀ-ÿ]) ([A-ZÀ-ÿ]{2,})\b", r"\1\2", cleaned)
    return cleaned.strip()


def parse_pdf(pdf_path: Path) -> dict[str, object]:
    reader = PdfReader(str(pdf_path))
    squads = []

    for page in reader.pages:
        text = page.extract_text(extraction_mode="layout")
        if not text:
            continue

        lines = [line.rstrip() for line in text.splitlines() if line.strip()]
        team_name = None
        fifa_code = None
        coach = None
        players = []

        for line in lines:
            raw_line = line.replace("\x00", "").replace("™", "").rstrip()
            normalized_line = normalize_text(line)

            if not team_name and "# POS" not in normalized_line and "Page" not in normalized_line:
                match = TEAM_RE.search(normalized_line)
                if match and "FIFA World Cup" not in normalized_line:
                    team_name = normalize_text(match.group(1))
                    fifa_code = match.group(2)
                    continue

            player_match = PLAYER_RE.match(raw_line)
            if player_match:
                shirt_and_name_columns = [
                    normalize_text(chunk)
                    for chunk in re.split(r"\s{2,}", player_match.group(3).strip())
                    if normalize_text(chunk)
                ]

                while len(shirt_and_name_columns) < 4:
                    shirt_and_name_columns.append("")

                players.append(
                    {
                        "number": int(player_match.group(1)),
                        "position": player_match.group(2),
                        "playerName": shirt_and_name_columns[0],
                        "firstNames": shirt_and_name_columns[1],
                        "lastNames": shirt_and_name_columns[2],
                        "shirtName": shirt_and_name_columns[3],
                        "dateOfBirth": player_match.group(4),
                        "club": normalize_text(player_match.group(5)),
                        "heightCm": int(player_match.group(6)),
                    }
                )
                continue

            if normalized_line.startswith("Head coach"):
                coach_parts = [
                    normalize_text(chunk)
                    for chunk in re.split(r"\s{2,}", raw_line.strip())
                    if normalize_text(chunk)
                ]
                if len(coach_parts) >= 2:
                    coach = coach_parts[1]

        if team_name and fifa_code and players:
            squads.append(
                {
                    "teamName": team_name,
                    "fifaCode": fifa_code,
                    "coach": coach or "",
                    "players": players,
                }
            )

    return {
        "sourceArticle": SOURCE_URL,
        "sourcePdf": PDF_URL,
        "squads": squads,
    }


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    data_dir = project_root / "src" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    pdf_path = Path("/tmp/fifa-squads-2026.pdf")
    urllib.request.urlretrieve(PDF_URL, pdf_path)

    parsed = parse_pdf(pdf_path)
    output_path = data_dir / "fifaConfirmedSquads.json"
    output_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
