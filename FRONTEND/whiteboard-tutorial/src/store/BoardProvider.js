import React, { useCallback, useReducer, useEffect, useRef } from "react";

import boardContext from "./board-context";
import { BOARD_ACTIONS, TOOL_ACTION_TYPES, TOOL_ITEMS } from "../constants";
import {
  createElement,
  getSvgPathFromStroke,
  isPointNearElement,
  deserializeElements,
  serializeElements,
} from "../utils/element";
import getStroke from "perfect-freehand";

const getCoordinates = (event) => {
  const canvas = document.getElementById("canvas");
  if (!canvas) return { clientX: event.clientX, clientY: event.clientY };
  const rect = canvas.getBoundingClientRect();
  return {
    clientX: event.clientX - rect.left,
    clientY: event.clientY - rect.top,
  };
};

const boardReducer = (state, action) => {
  switch (action.type) {
    case BOARD_ACTIONS.LOAD_ELEMENTS: {
      // Deserialize elements to reconstruct roughEle and path objects
      const deserializedElements = deserializeElements(action.payload.elements);
      return {
        ...state,
        elements: deserializedElements,
        history: [deserializedElements],
        index: 0,
        toolActionType: TOOL_ACTION_TYPES.NONE, // Reset drawing state
      };
    }
    case BOARD_ACTIONS.CHANGE_TOOL: {
      return {
        ...state,
        activeToolItem: action.payload.tool,
      };
    }
    case BOARD_ACTIONS.CHANGE_ACTION_TYPE:
      return {
        ...state,
        toolActionType: action.payload.actionType,
      };
    case BOARD_ACTIONS.DRAW_DOWN: {
      const { clientX, clientY, stroke, fill, size } = action.payload;
      const newElement = createElement(
        state.elements.length,
        clientX,
        clientY,
        clientX,
        clientY,
        { type: state.activeToolItem, stroke, fill, size }
      );
      const prevElements = state.elements;
      return {
        ...state,
        toolActionType:
          state.activeToolItem === TOOL_ITEMS.TEXT
            ? TOOL_ACTION_TYPES.WRITING
            : TOOL_ACTION_TYPES.DRAWING,
        elements: [...prevElements, newElement],
      };
    }
    case BOARD_ACTIONS.DRAW_MOVE: {
      const { clientX, clientY } = action.payload;
      const newElements = [...state.elements];
      const index = state.elements.length - 1;
      const { type } = newElements[index];
      switch (type) {
        case TOOL_ITEMS.LINE:
        case TOOL_ITEMS.RECTANGLE:
        case TOOL_ITEMS.CIRCLE:
        case TOOL_ITEMS.ARROW:
          const { x1, y1, stroke, fill, size } = newElements[index];
          const newElement = createElement(index, x1, y1, clientX, clientY, {
            type: state.activeToolItem,
            stroke,
            fill,
            size,
          });
          newElements[index] = newElement;
          return {
            ...state,
            elements: newElements,
          };
        case TOOL_ITEMS.BRUSH:
          newElements[index].points = [
            ...newElements[index].points,
            { x: clientX, y: clientY },
          ];
          newElements[index].path = new Path2D(
            getSvgPathFromStroke(getStroke(newElements[index].points, {
              size: newElements[index].size || 2,
              thinning: 0.5,
              smoothing: 0.5,
              streamline: 0.5,
            }))
          );
          return {
            ...state,
            elements: newElements,
          };
        default:
          throw new Error("Type not recognized");
      }
    }
    case BOARD_ACTIONS.DRAW_UP: {
      const elementsCopy = [...state.elements];
      const serializedCopy = serializeElements(elementsCopy);
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(serializedCopy);
      return {
        ...state,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.ERASE: {
      const { clientX, clientY } = action.payload;
      let newElements = [...state.elements];
      newElements = newElements.filter((element) => {
        return !isPointNearElement(element, clientX, clientY);
      });
      return {
        ...state,
        elements: newElements,
      };
    }
    case BOARD_ACTIONS.ERASE_COMPLETE: {
      const serializedElements = serializeElements(state.elements);
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(serializedElements);
      return {
        ...state,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.CHANGE_TEXT: {
      const index = state.elements.length - 1;
      const newElements = [...state.elements];
      newElements[index].text = action.payload.text;
      const serializedElements = serializeElements(newElements);
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(serializedElements);
      return {
        ...state,
        toolActionType: TOOL_ACTION_TYPES.NONE,
        elements: newElements,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.UNDO: {
      if (state.index <= 0) return state;
      const restoredElements = deserializeElements(state.history[state.index - 1]);
      return {
        ...state,
        elements: restoredElements,
        index: state.index - 1,
      };
    }
    case BOARD_ACTIONS.REDO: {
      if (state.index >= state.history.length - 1) return state;
      const restoredElements = deserializeElements(state.history[state.index + 1]);
      return {
        ...state,
        elements: restoredElements,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.CLEAR_ALL: {
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push([]);
      return {
        ...state,
        elements: [],
        history: newHistory,
        index: state.index + 1,
      };
    }
    default:
      return state;
  }
};

const initialBoardState = {
  activeToolItem: TOOL_ITEMS.BRUSH,
  toolActionType: TOOL_ACTION_TYPES.NONE,
  elements: [],
  history: [[]],
  index: 0,
};

const BoardProvider = ({ children, initialElements }) => {
  const [boardState, dispatchBoardAction] = useReducer(
    boardReducer,
    initialBoardState
  );
  const previousIndexRef = useRef(0);
  const previousActionTypeRef = useRef(TOOL_ACTION_TYPES.NONE);

  // Load initial elements when provided
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.LOAD_ELEMENTS,
        payload: {
          elements: initialElements,
        },
      });
    }
  }, [initialElements]);

  // Emit canvas update event when a draw/erase action completes (history index changes)
  useEffect(() => {
    const indexChanged = boardState.index !== previousIndexRef.current;
    const actionBecameNone = previousActionTypeRef.current !== TOOL_ACTION_TYPES.NONE &&
      boardState.toolActionType === TOOL_ACTION_TYPES.NONE;

    // Emit event when: 
    // 1. History index changed (drawing/erasing completed)
    // 2. Action type became NONE (drawing/erasing ended)
    // 3. Not during initial load (index > 0)
    if (indexChanged && actionBecameNone && boardState.index > 0) {
      window.dispatchEvent(new CustomEvent('canvasUpdated', {
        detail: { elements: boardState.elements }
      }));
    }

    previousIndexRef.current = boardState.index;
    previousActionTypeRef.current = boardState.toolActionType;
  }, [boardState.index, boardState.toolActionType, boardState.elements]);

  const changeToolHandler = (tool) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_TOOL,
      payload: {
        tool,
      },
    });
  };

  const boardMouseDownHandler = (event, toolboxState) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    const { clientX, clientY } = getCoordinates(event);
    if (boardState.activeToolItem === TOOL_ITEMS.ERASER) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
        payload: {
          actionType: TOOL_ACTION_TYPES.ERASING,
        },
      });
      return;
    }
    dispatchBoardAction({
      type: BOARD_ACTIONS.DRAW_DOWN,
      payload: {
        clientX,
        clientY,
        stroke: toolboxState[boardState.activeToolItem]?.stroke,
        fill: toolboxState[boardState.activeToolItem]?.fill,
        size: toolboxState[boardState.activeToolItem]?.size,
      },
    });
  };

  const boardMouseMoveHandler = (event) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    const { clientX, clientY } = getCoordinates(event);
    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_MOVE,
        payload: {
          clientX,
          clientY,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.ERASE,
        payload: {
          clientX,
          clientY,
        },
      });
    }
  };

  const boardMouseUpHandler = () => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_UP,
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.ERASE_COMPLETE,
      });
    }
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
      payload: {
        actionType: TOOL_ACTION_TYPES.NONE,
      },
    });
  };

  const textAreaBlurHandler = (text) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_TEXT,
      payload: {
        text,
      },
    });
  };

  const boardUndoHandler = useCallback(() => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.UNDO,
    });
  }, []);

  const boardRedoHandler = useCallback(() => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.REDO,
    });
  }, []);

  const loadElements = useCallback((elements) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.LOAD_ELEMENTS,
      payload: {
        elements,
      },
    });
  }, []);

  const clearAll = useCallback(() => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CLEAR_ALL,
    });
  }, []);

  const boardContextValue = {
    activeToolItem: boardState.activeToolItem,
    elements: boardState.elements,
    toolActionType: boardState.toolActionType,
    changeToolHandler,
    boardMouseDownHandler,
    boardMouseMoveHandler,
    boardMouseUpHandler,
    textAreaBlurHandler,
    undo: boardUndoHandler,
    redo: boardRedoHandler,
    loadElements,
    clearAll,
  };

  return (
    <boardContext.Provider value={boardContextValue}>
      {children}
    </boardContext.Provider>
  );
};

export default BoardProvider;
