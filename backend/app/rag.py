"""Local RAG: ChromaDB in-memory + nomic-embed-text via Ollama.

Zero cloud calls. The collection is rebuilt at startup so any edit to
icvd_corpus.md takes effect on the next uvicorn restart.
"""
from __future__ import annotations

import re
from pathlib import Path

import chromadb
import ollama

CORPUS_PATH = Path(__file__).parent / "data" / "icvd_corpus.md"
EMBED_MODEL = "nomic-embed-text"
COLLECTION_NAME = "vertigodx_icvd"


def _chunk_markdown(text: str) -> list[tuple[str, str]]:
    """Split corpus by H2 headers. Returns list of (title, content) tuples."""
    sections = re.split(r"\n## ", text)
    chunks: list[tuple[str, str]] = []
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.split("\n", 1)
        title = lines[0].strip().lstrip("# ").strip()
        content = lines[1].strip() if len(lines) > 1 else ""
        if content:
            chunks.append((title, f"## {title}\n\n{content}"))
    return chunks


def _embed(text: str) -> list[float]:
    """Generate a single embedding via Ollama."""
    resp = ollama.embeddings(model=EMBED_MODEL, prompt=text)
    return resp["embedding"]


class RAGStore:
    """In-memory ChromaDB collection populated from icvd_corpus.md.

    The collection is dropped + recreated at construction time so reload
    behavior is predictable across uvicorn restarts.
    """

    def __init__(self) -> None:
        self.client = chromadb.Client()
        try:
            self.client.delete_collection(COLLECTION_NAME)
        except Exception:
            # Collection may not exist on first start
            pass
        self.collection = self.client.create_collection(name=COLLECTION_NAME)
        self._ingest()

    def _ingest(self) -> None:
        text = CORPUS_PATH.read_text(encoding="utf-8")
        chunks = _chunk_markdown(text)
        if not chunks:
            raise RuntimeError(f"No chunks parsed from {CORPUS_PATH}")
        embeddings = [_embed(content) for _, content in chunks]
        self.collection.add(
            ids=[f"chunk_{i}" for i in range(len(chunks))],
            documents=[content for _, content in chunks],
            embeddings=embeddings,
            metadatas=[{"title": title} for title, _ in chunks],
        )

    def retrieve(self, query: str, k: int = 3) -> list[dict]:
        """Return the top-k chunks most relevant to `query`."""
        query_emb = _embed(query)
        results = self.collection.query(query_embeddings=[query_emb], n_results=k)
        out: list[dict] = []
        for i in range(len(results["documents"][0])):
            out.append(
                {
                    "title": results["metadatas"][0][i]["title"],
                    "content": results["documents"][0][i],
                    "distance": (
                        results["distances"][0][i] if "distances" in results else None
                    ),
                }
            )
        return out


# Module-level singleton for FastAPI lifecycle
_store: RAGStore | None = None


def get_store() -> RAGStore:
    global _store
    if _store is None:
        _store = RAGStore()
    return _store
