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
import { s } from './css/styles';

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

