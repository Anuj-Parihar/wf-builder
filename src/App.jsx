import React, { useState, useCallback } from "react";
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
// -------------------- App --------------------
export default function App() {
  const [nodes, setNodes] = useState(() => {
    const start = createNode("start", "Start");
    return { [start.id]: start };
  });
  const [rootId] = useState(() => Object.keys(nodes)[0]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const commit = (newNodes) => {
    setHistory((h) => [...h, nodes]);
    setFuture([]);
    setNodes(newNodes);
  };

  // -------------------- Actions --------------------
  const addNode = useCallback(
    (parentId, parentType, branchKey, newType) => {
      const newNode = createNode(newType, newType.toUpperCase());
      const updated = { ...nodes, [newNode.id]: newNode };

      const parent = updated[parentId];
      if (parentType === "branch") {
        parent.children[branchKey] = newNode.id;
      } else {
        parent.children = [newNode.id];
      }
      commit(updated);
    },
    [nodes]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (nodeId === rootId) return;

      const updated = { ...nodes };
      const target = updated[nodeId];

      Object.values(updated).forEach((node) => {
        if (node.type === "branch") {
          Object.keys(node.children).forEach((k) => {
            if (node.children[k] === nodeId) {
              node.children[k] = target.type === "branch"
                ? null
                : target.children[0] || null;
            }
          });
        } else if (Array.isArray(node.children)) {
          if (node.children[0] === nodeId) {
            node.children = target.type === "branch" ? [] : target.children;
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
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setFuture((f) => [nodes, ...f]);
    setNodes(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture(future.slice(1));
    setHistory((h) => [...h, nodes]);
    setNodes(next);
  };

  const save = () => {
    console.log("Workflow:", nodes);
  };

  return (
    <div className="app">
      <header>
        <h1>Workflow Builder</h1>
        <div className="toolbar">
          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
          <button onClick={save}>Save</button>
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
      <input
        value={node.label}
        onChange={(e) => onEdit(id, e.target.value)}
      />

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
                <AddMenu
                  onSelect={(t) => onAdd(id, "branch", key, t)}
                />
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
