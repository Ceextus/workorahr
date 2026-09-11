import { api } from "@/lib/api-client";

import type { OpsPulse } from "./types";

export const getOpsPulse = () => api.get<OpsPulse>("/ops-pulse");
