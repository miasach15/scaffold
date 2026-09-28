import { createPortal } from "react-dom";
import { useBackgroundInert } from "../../hooks/useBackgroundInert";

// Every full-screen modal (Settings, Brain Dump, Weekly Review, Search, task/session
// detail, etc.) renders through this instead of inline — it portals to document.body
// (a sibling of #root, so it stays interactive while #root goes inert) and makes the
// rest of the app unreachable by click OR keyboard for as long as it's mounted.
export default function ModalPortal({ children }) {
  useBackgroundInert();
  return createPortal(children, document.body);
}
