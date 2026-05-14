import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DEFAULT_BASE_URL = "http://localhost:8000";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type LogItem = {
  id: string;
  method: HttpMethod;
  path: string;
  status: number;
  body: unknown | null;
  response: unknown;
  time: string;
};

type Note = {
  id: number;
  title: string;
  content: string | null;
};

type NoteCreateBody = {
  title: string;
  content: string | null;
};

type NoteUpdateBody = {
  title?: string;
  content?: string | null;
};

type Snippet = {
  label: string;
  method: HttpMethod | null;
  code: string;
};

// ─── FASTAPI CODE SNIPPETS ───────────────────────────────────────────────────
const CODE_SNIPPETS: Record<string, Snippet> = {
  setup: {
    label: "main.py — App setup",
    method: null,
    code: `# pip install fastapi uvicorn sqlalchemy psycopg2-binary

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)`,
  },
  db: {
    label: "database.py — PostgreSQL connection",
    method: null,
    code: `from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = (
  "postgresql://user:password@localhost/notes_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
  pass

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()`,
  },
  model: {
    label: "models.py — SQLAlchemy model",
    method: null,
    code: `from sqlalchemy import Column, Integer, String, Text
from database import Base

class Note(Base):
  __tablename__ = "notes"

  id      = Column(Integer, primary_key=True)
  title   = Column(String(120), nullable=False)
  content = Column(Text, nullable=True)`,
  },
  GET: {
    label: "GET /notes — Read all",
    method: "GET",
    code: `from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Note

@app.get("/notes")
def get_notes(db: Session = Depends(get_db)):
  return db.query(Note).all()`,
  },
  POST: {
    label: "POST /notes — Create",
    method: "POST",
    code: `from pydantic import BaseModel
from typing import Optional

class NoteCreate(BaseModel):
  title: str
  content: Optional[str] = None

@app.post("/notes", status_code=201)
def create_note(
  note: NoteCreate,
  db: Session = Depends(get_db)
):
  db_note = Note(**note.model_dump())
  db.add(db_note)
  db.commit()
  db.refresh(db_note)
  return db_note`,
  },
  DELETE: {
    label: "DELETE /notes/{id} — Delete",
    method: "DELETE",
    code: `from fastapi import HTTPException

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(
  note_id: int,
  db: Session = Depends(get_db)
):
  note = db.query(Note).get(note_id)
  if not note:
    raise HTTPException(404, "Note not found")
  db.delete(note)
  db.commit()`,
  },
  PUT: {
    label: "PUT /notes/{id} — Update",
    method: "PUT",
    code: `class NoteUpdate(BaseModel):
  title: Optional[str] = None
  content: Optional[str] = None

@app.put("/notes/{note_id}")
def update_note(
  note_id: int,
  data: NoteUpdate,
  db: Session = Depends(get_db)
):
  note = db.query(Note).get(note_id)
  if not note:
    raise HTTPException(404, "Not found")
  for k, v in data.model_dump(
    exclude_none=True
  ).items():
    setattr(note, k, v)
  db.commit()
  db.refresh(note)
  return note`,
  },
};

const METHOD_COLORS: Record<string, string> = {
  GET: "#3b82f6",
  POST: "#10b981",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function BackendPlayground() {
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE_URL);
  const [editingUrl, setEditingUrl] = useState<boolean>(false);
  const [tmpUrl, setTmpUrl] = useState<string>(DEFAULT_BASE_URL);

  const [tab, setTab] = useState<"crud" | "logs" | "code">("crud");
  const [activeSnippet, setActiveSnippet] = useState<string>("setup");

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetched, setFetched] = useState<boolean>(false);

  const [newTitle, setNewTitle] = useState<string>("");
  const [newContent, setNewContent] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");

  const [logs, setLogs] = useState<LogItem[]>([]);

  // ── Unique ID counter ────────────────────────────────────────────────────
  const logSeq = useRef<number>(0);

  // ── Log request ──────────────────────────────────────────────────────────
  const logRequest = useCallback(
    (
      method: HttpMethod,
      path: string,
      status: number,
      body: unknown | null,
      response: unknown
    ): void => {
      const ts = Date.now();
      const id = `${ts}-${logSeq.current++}`;
      const time = new Date(ts).toISOString().slice(11, 19); // HH:MM:SS

      setLogs((prev) =>
        [
          { id, method, path, status, body, response, time },
          ...prev,
        ].slice(0, 20)
      );
    },
    []
  );

  // ── API helpers ──────────────────────────────────────────────────────────
  const apiFetch = useCallback(
    async (
      method: HttpMethod,
      path: string,
      body?: NoteCreateBody | NoteUpdateBody
    ): Promise<unknown> => {
      const url = `${baseUrl}${path}`;
      const opts: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      };
      const res = await fetch(url, opts);
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch (_) {
        // raw text response — json stays null
      }
      logRequest(method, path, res.status, body ?? null, json ?? text);
      if (!res.ok) throw new Error(`${res.status}: ${text}`);
      return json;
    },
    [baseUrl, logRequest]
  );

  // ── CRUD operations ──────────────────────────────────────────────────────
  const fetchNotes = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await apiFetch("GET", "/notes");
      setNotes(Array.isArray(data) ? (data as Note[]) : []);
      setFetched(true);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const createNote = useCallback(async (): Promise<void> => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const note = await apiFetch("POST", "/notes", {
        title: newTitle.trim(),
        content: newContent.trim() || null,
      });
      if (note) {
        setNotes((prev) => [note as Note, ...prev]);
      }
      setNewTitle("");
      setNewContent("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setCreating(false);
    }
  }, [apiFetch, newTitle, newContent]);

  const deleteNote = useCallback(
    async (id: number): Promise<void> => {
      try {
        await apiFetch("DELETE", `/notes/${id}`);
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } catch (e) {
        Alert.alert("Error", (e as Error).message);
      }
    },
    [apiFetch]
  );

  const saveEdit = useCallback(async (): Promise<void> => {
    if (!editTitle.trim()) return;
    try {
      const updated = await apiFetch("PUT", `/notes/${editingId}`, {
        title: editTitle.trim(),
        content: editContent.trim() || null,
      });
      if (updated) {
        setNotes((prev) =>
          prev.map((n) => (n.id === editingId ? (updated as Note) : n))
        );
      }
      setEditingId(null);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }, [apiFetch, editingId, editTitle, editContent]);

  // ── Render: URL bar ────────────────────────────────────────────────────────
  const renderUrlBar = (): React.ReactElement => (
    <View style={s.urlBar}>
      <Text style={s.urlLabel}>API_BASE</Text>
      {editingUrl ? (
        <>
          <TextInput
            style={[s.urlInput, s.urlInputEditing]}
            value={tmpUrl}
            onChangeText={setTmpUrl}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              setBaseUrl(tmpUrl);
              setEditingUrl(false);
              setFetched(false);
              setNotes([]);
            }}
          />
          <TouchableOpacity
            style={s.urlBtn}
            onPress={() => {
              setBaseUrl(tmpUrl);
              setEditingUrl(false);
              setFetched(false);
              setNotes([]);
            }}
          >
            <Text style={s.urlBtnTxt}>OK</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={s.urlDisplay}
          onPress={() => {
            setTmpUrl(baseUrl);
            setEditingUrl(true);
          }}
        >
          <Text style={s.urlText} numberOfLines={1}>
            {baseUrl}
          </Text>
          <Text style={s.urlEdit}>edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render: Tabs ───────────────────────────────────────────────────────────
  const renderTabs = (): React.ReactElement => (
    <View style={s.tabs}>
      {(
        [
          { key: "crud", label: "CRUD Demo" },
          { key: "logs", label: `Logs (${logs.length})` },
          { key: "code", label: "FastAPI Code" },
        ] as { key: "crud" | "logs" | "code"; label: string }[]
      ).map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[s.tab, tab === key && s.tabActive]}
          onPress={() => setTab(key)}
        >
          <Text style={[s.tabText, tab === key && s.tabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Render: Note item ──────────────────────────────────────────────────────
  const renderNoteItem = useCallback(
    (note: Note): React.ReactElement => {
      if (editingId === note.id) {
        return (
          <View key={note.id} style={s.noteCard}>
            <TextInput
              style={s.input}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />
            <TextInput
              style={[s.input, s.textArea]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              numberOfLines={3}
            />
            <View style={s.noteActions}>
              <TouchableOpacity
                style={[s.smallBtn, s.btnPut]}
                onPress={saveEdit}
              >
                <Text style={s.smallBtnTxt}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.smallBtn, s.btnGhost]}
                onPress={() => setEditingId(null)}
              >
                <Text style={s.ghostBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      return (
        <View key={note.id} style={s.noteCard}>
          <View style={s.noteHeader}>
            <Text style={s.noteId}>#{note.id}</Text>
            <Text style={s.noteTitle} numberOfLines={1}>
              {note.title}
            </Text>
          </View>
          {!!note.content && (
            <Text style={s.noteContent} numberOfLines={2}>
              {note.content}
            </Text>
          )}
          <View style={s.noteActions}>
            <TouchableOpacity
              style={[s.smallBtn, s.btnPut]}
              onPress={() => {
                setEditingId(note.id);
                setEditTitle(note.title);
                setEditContent(note.content ?? "");
              }}
            >
              <Text style={s.smallBtnTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.smallBtn, s.btnDelete]}
              onPress={() =>
                Alert.alert(
                  "Delete note?",
                  `"${note.title}" will be removed from PostgreSQL.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteNote(note.id),
                    },
                  ]
                )
              }
            >
              <Text style={s.smallBtnTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [editingId, editTitle, editContent, saveEdit, deleteNote]
  );

  // ── Render: CRUD tab ───────────────────────────────────────────────────────
  const renderCrudTab = (): React.ReactElement => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.flex1}
    >
      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Create form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            <Text style={[s.methodBadge, { color: METHOD_COLORS.POST }]}>
              POST{" "}
            </Text>
            /notes — Create
          </Text>
          <TextInput
            style={s.input}
            placeholder="Title *"
            placeholderTextColor="#4b5563"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Content (optional)"
            placeholderTextColor="#4b5563"
            value={newContent}
            onChangeText={setNewContent}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[s.btn, s.btnPost, !newTitle.trim() && s.btnDisabled]}
            onPress={createNote}
            disabled={!newTitle.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnTxt}>Create Note</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Read / list */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardTitle}>
              <Text style={[s.methodBadge, { color: METHOD_COLORS.GET }]}>
                GET{" "}
              </Text>
              /notes — Read all
            </Text>
            <TouchableOpacity style={s.fetchBtn} onPress={fetchNotes}>
              {loading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={s.fetchBtnTxt}>
                  {fetched ? "Refresh" : "Fetch →"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {!fetched && (
            <Text style={s.hint}>
              Hit Fetch to call GET /notes on your FastAPI server.
            </Text>
          )}

          {fetched && notes.length === 0 && (
            <Text style={s.hint}>No notes yet — create one above.</Text>
          )}

          {notes.map((note) => renderNoteItem(note))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Render: Log item ───────────────────────────────────────────────────────
  const renderLogItem = useCallback(
    ({ item }: { item: LogItem }): React.ReactElement => (
      <View style={s.logCard}>
        <View style={s.logHeader}>
          <View
            style={[
              s.methodTag,
              { backgroundColor: METHOD_COLORS[item.method] + "22" },
            ]}
          >
            <Text
              style={[s.methodTagTxt, { color: METHOD_COLORS[item.method] }]}
            >
              {item.method}
            </Text>
          </View>
          <Text style={s.logPath}>{item.path}</Text>
          <View
            style={[
              s.statusTag,
              {
                backgroundColor:
                  item.status < 300
                    ? "#10b98122"
                    : item.status < 400
                    ? "#f59e0b22"
                    : "#ef444422",
              },
            ]}
          >
            <Text
              style={[
                s.statusTagTxt,
                {
                  color:
                    item.status < 300
                      ? "#10b981"
                      : item.status < 400
                      ? "#f59e0b"
                      : "#ef4444",
                },
              ]}
            >
              {item.status}
            </Text>
          </View>
          <Text style={s.logTime}>{item.time}</Text>
        </View>

        {item.body !== null && (
          <View style={s.logSection}>
            <Text style={s.logSectionLabel}>REQUEST BODY</Text>
            <Text style={s.logCode}>
              {JSON.stringify(item.body, null, 2)}
            </Text>
          </View>
        )}

        <View style={s.logSection}>
          <Text style={s.logSectionLabel}>RESPONSE</Text>
          <Text style={s.logCode}>
            {typeof item.response === "string"
              ? item.response
              : JSON.stringify(item.response, null, 2)}
          </Text>
        </View>
      </View>
    ),
    []
  );

  // ── Render: Logs tab ───────────────────────────────────────────────────────
  const renderLogsTab = (): React.ReactElement => (
    <FlatList<LogItem>
      data={logs}
      keyExtractor={(item) => item.id}
      style={s.scrollArea}
      contentContainerStyle={[
        s.scrollContent,
        logs.length === 0 && s.flex1,
      ]}
      ListEmptyComponent={
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No requests yet</Text>
          <Text style={s.hint}>
            Use the CRUD Demo tab to make API calls. Each request will
            appear here with full details.
          </Text>
        </View>
      }
      renderItem={renderLogItem}
    />
  );

  // ── Render: Code tab ──────────────────────────────────────────────────────
  const snippetKeys = Object.keys(CODE_SNIPPETS);

  const renderCodeTab = (): React.ReactElement => (
    <View style={s.flex1}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.snippetBar}
        contentContainerStyle={s.snippetBarContent}
      >
        {snippetKeys.map((key) => {
          const sn = CODE_SNIPPETS[key];
          return (
            <TouchableOpacity
              key={key}
              style={[
                s.snippetChip,
                activeSnippet === key && s.snippetChipActive,
              ]}
              onPress={() => setActiveSnippet(key)}
            >
              {sn.method && (
                <Text
                  style={[
                    s.snippetMethod,
                    { color: METHOD_COLORS[sn.method] },
                  ]}
                >
                  {sn.method}{" "}
                </Text>
              )}
              <Text
                style={[
                  s.snippetChipTxt,
                  activeSnippet === key && s.snippetChipTxtActive,
                ]}
              >
                {key === "setup"
                  ? "Setup"
                  : key === "db"
                  ? "Database"
                  : key === "model"
                  ? "Model"
                  : sn.method}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {CODE_SNIPPETS[activeSnippet].label}
          </Text>
          <View style={s.codeBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={s.codeText}>
                {CODE_SNIPPETS[activeSnippet].code}
              </Text>
            </ScrollView>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Quick Start</Text>
          {(
            [
              {
                step: "1",
                cmd: "pip install fastapi uvicorn sqlalchemy psycopg2-binary",
                note: "Install dependencies",
              },
              {
                step: "2",
                cmd: "createdb notes_db",
                note: "Create PostgreSQL database",
              },
              {
                step: "3",
                cmd: "uvicorn main:app --reload",
                note: "Start the FastAPI dev server",
              },
              {
                step: "4",
                cmd: "open http://localhost:8000/docs",
                note: "Auto-generated Swagger UI",
              },
            ] as { step: string; cmd: string; note: string }[]
          ).map((item) => (
            <View key={item.step} style={s.stepRow}>
              <View style={s.stepBadge}>
                <Text style={s.stepBadgeTxt}>{item.step}</Text>
              </View>
              <View style={s.flex1}>
                <Text style={s.stepNote}>{item.note}</Text>
                <Text style={s.stepCmd}>{item.cmd}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.root}>
        <StatusBar style="light" />

        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Backend Playground</Text>
            <Text style={s.headerSub}>
              FastAPI · PostgreSQL · SQLAlchemy
            </Text>
          </View>
          <View style={s.headerDot} />
        </View>

        {renderUrlBar()}
        {renderTabs()}

        <View style={s.flex1}>
          {tab === "crud" && renderCrudTab()}
          {tab === "logs" && renderLogsTab()}
          {tab === "code" && renderCodeTab()}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#060b14",
  },
  flex1: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: "#060b14",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#060b14",
    borderBottomWidth: 1,
    borderBottomColor: "#0f1f36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  headerSub: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  urlBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c1525",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0f1f36",
    gap: 8,
  },
  urlLabel: {
    fontSize: 10,
    color: "#3b82f6",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  urlDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  urlEdit: {
    fontSize: 11,
    color: "#3b82f6",
    marginLeft: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 12,
    color: "#e2e8f0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  urlInputEditing: {},
  urlBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  urlBtnTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#060b14",
    borderBottomWidth: 1,
    borderBottomColor: "#0f1f36",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    rowGap: 16,
  },
  card: {
    backgroundColor: "#0c1525",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f1f36",
    padding: 16,
    rowGap: 12,
  },
  cardTitle: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodBadge: {
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  input: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
    color: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPost: { backgroundColor: "#10b981" },
  btnPut: { backgroundColor: "#f59e0b" },
  btnDelete: { backgroundColor: "#ef4444" },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  smallBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  smallBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  ghostBtnTxt: { color: "#64748b", fontSize: 12 },
  fetchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  fetchBtnTxt: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
    textAlign: "center",
    marginVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    rowGap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
    padding: 12,
    rowGap: 8,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  noteId: {
    fontSize: 10,
    color: "#334155",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  noteTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  noteContent: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  noteActions: {
    flexDirection: "row",
    columnGap: 8,
    marginTop: 4,
  },
  logCard: {
    backgroundColor: "#0c1525",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0f1f36",
    padding: 12,
    rowGap: 10,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    flexWrap: "wrap",
  },
  methodTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodTagTxt: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  logPath: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusTagTxt: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  logTime: {
    fontSize: 10,
    color: "#334155",
  },
  logSection: { rowGap: 4 },
  logSectionLabel: {
    fontSize: 9,
    color: "#334155",
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  logCode: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 18,
  },
  snippetBar: {
    backgroundColor: "#060b14",
    borderBottomWidth: 1,
    borderBottomColor: "#0f1f36",
    maxHeight: 48,
  },
  snippetBarContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    columnGap: 8,
    paddingVertical: 10,
  },
  snippetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c1525",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#0f1f36",
  },
  snippetChipActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#0d1f3c",
  },
  snippetChipTxt: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  snippetChipTxtActive: { color: "#93c5fd" },
  snippetMethod: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  codeBlock: {
    backgroundColor: "#060b14",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0f1f36",
    padding: 14,
  },
  codeText: {
    fontSize: 12,
    color: "#7dd3fc",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0f1f36",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepBadgeTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b82f6",
  },
  stepNote: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 3,
  },
  stepCmd: {
    fontSize: 12,
    color: "#7dd3fc",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});