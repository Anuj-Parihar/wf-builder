import React, { useState, useCallback, useRef, useEffect } from "react";
const createId = () => Math.random().toString(36).slice(2);
const createNode = (type, label) => {
  const id = createId();
  if (type === "branch") {
    return {
      id,
      type,
      label,
      children: { true: null, false: null },
    };
  }
  return {
    id,
    type,
    label,
    children: [],
  };
};

// Deep clone helper used for immutable history snapshots
const snapshot = (obj) => JSON.parse(JSON.stringify(obj));
// -------------------- App --------------------
export default function App() {
  const [nodes, setNodes] = useState(() => {
    const start = createNode("start", "Start");
    return { [start.id]: start };
  });
  const [rootId] = useState(() => Object.keys(nodes)[0]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const commit = (newNodes) => {
    setHistory((h) => [...h, snapshot(nodes)]);
    setFuture([]);
    setNodes(snapshot(newNodes));
  };

  // -------------------- Actions --------------------
  const addNode = useCallback(
    (parentId, parentType, branchKey, newType) => {
      const newNode = createNode(newType, newType.toUpperCase());
      const parent = nodes[parentId];
      let updatedParent;

      if (parentType === "branch") {
        updatedParent = {
          ...parent,
          children: { ...parent.children, [branchKey]: newNode.id },
        };
      } else {
        updatedParent = {
          ...parent,
          children: [newNode.id],
        };
      }

      const updated = {
        ...nodes,
        [newNode.id]: newNode,
        [parentId]: updatedParent,
      };
      commit(updated);
    },
    [nodes]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (nodeId === rootId) return;

      const target = nodes[nodeId];
      // clone every node shallowly so we can modify children immutably
      const updated = Object.keys(nodes).reduce((acc, key) => {
        acc[key] = { ...nodes[key] };
        return acc;
      }, {});

      Object.values(updated).forEach((node) => {
        if (node.type === "branch") {
          const newChildren = { ...node.children };
          Object.keys(newChildren).forEach((k) => {
            if (newChildren[k] === nodeId) {
              newChildren[k] =
                target.type === "branch" ? null : target.children[0] || null;
            }
          });
          node.children = newChildren;
        } else if (Array.isArray(node.children)) {
          if (node.children[0] === nodeId) {
            node.children =
              target.type === "branch" ? [] : [...target.children];
          }
        }
      });

      delete updated[nodeId];
      commit(updated);
    },
    [nodes, rootId]
  );

  const updateLabel = (id, label) => {
    commit({ ...nodes, [id]: { ...nodes[id], label } });
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [snapshot(nodes), ...f]);
      setNodes(snapshot(prev));
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, snapshot(nodes)]);
      setNodes(snapshot(next));
      return rest;
    });
  };

  const save = () => {
    console.log("Workflow:", nodes);
    // show transient confirmation message
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    const ts = new Date().toLocaleTimeString();
    setSaveMessage(`Saved at ${ts}`);
    saveTimer.current = setTimeout(() => {
      setSaveMessage("");
      saveTimer.current = null;
    }, 2000);
  };

  return (
    <div className="app">
      <header>
        <h1>Workflow Builder</h1>
        <div className="toolbar">
          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
          <button onClick={save}>Save in Console</button>
          {saveMessage && (
            <span className="save-message" aria-live="polite">
              {saveMessage}
            </span>
          )}
        </div>
      </header>

      <div className="canvas">
        <Node
          id={rootId}
          nodes={nodes}
          onAdd={addNode}
          onDelete={deleteNode}
          onEdit={updateLabel}
        />
      </div>
    </div>
  );
}

// -------------------- Node Component --------------------
function Node({ id, nodes, onAdd, onDelete, onEdit }) {
  const node = nodes[id];

  return (
    <div className={`node ${node.type}`}>
      <input value={node.label} onChange={(e) => onEdit(id, e.target.value)} />

      {node.type !== "start" && (
        <button className="delete" onClick={() => onDelete(id)}>
          ✕
        </button>
      )}

      <div className="children">
        {node.type === "branch" ? (
          Object.entries(node.children).map(([key, childId]) => (
            <div key={key} className="branch">
              <span className="branch-label">{key.toUpperCase()}</span>
              {childId ? (
                <Node
                  id={childId}
                  nodes={nodes}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ) : (
                <AddMenu onSelect={(t) => onAdd(id, "branch", key, t)} />
              )}
            </div>
          ))
        ) : node.children[0] ? (
          <Node
            id={node.children[0]}
            nodes={nodes}
            onAdd={onAdd}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : node.type !== "end" ? (
          <AddMenu onSelect={(t) => onAdd(id, node.type, null, t)} />
        ) : null}
      </div>
    </div>
  );
}

// -------------------- Add Menu --------------------
function AddMenu({ onSelect }) {
  return (
    <div className="add-menu">
      <button onClick={() => onSelect("action")}>+ Action</button>
      <button onClick={() => onSelect("branch")}>+ Branch</button>
      <button onClick={() => onSelect("end")}>+ End</button>
    </div>
  );
}
