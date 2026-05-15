import { Layers } from "lucide-react";
import ComingSoonPanel from "../components/common/ComingSoonPanel";

export default function DecksPage() {
  return (
    <ComingSoonPanel
      icon={Layers}
      title="Decks"
      description="Hide, restore, or delete user-created decks."
      plannedFeatures={[
        "Update a deck's status to hidden, deleted, or active",
        "Record a moderation reason against the deck",
        "Link directly from a deck report into the deck record",
      ]}
    />
  );
}
