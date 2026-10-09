import { createFileRoute } from "@tanstack/react-router";

import { MajlissHome } from "@/features/majliss/MajlissUi";

export const Route = createFileRoute("/majliss/")({ component: MajlissHome });
