import { createPortal } from "react-dom";
import { useBackgroundInert } from "../../hooks/useBackgroundInert";

// Every full-screen modal (Settings, Brain Dump, Weekly Review, Search, task/session
// detail, etc.) renders through this instead of inline — it portals to document.body
// (a sibling of #root, so it stays interactive while #root goes inert) and makes the
// rest of the app unreachable by click OR keyboard for as long as it's mounted.
export default function ModalPortal({ children }) {
  useBackgroundInert();
  // The fade-in itself lives in App.jsx's global stylesheet (.modal-portal-enter) so
  // every modal gets it for free just by going through this one shared wrapper.
  return createPortal(<div className="modal-portal-enter">{children}</div>, document.body);
}
