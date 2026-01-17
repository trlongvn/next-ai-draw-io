import { describe, expect, it } from "vitest"
import { getDefaultExternalStorageConfig } from "../../lib/external-storage"

describe("external-storage", () => {
    describe("getDefaultExternalStorageConfig", () => {
        it("returns default configuration with correct structure", () => {
            const config = getDefaultExternalStorageConfig()

            expect(config).toEqual({
                endpointUrl: "",
                method: "POST",
                headers: {},
                mappingSchema: {
                    content: "$xml",
                    title: "$filename",
                    created_at: "$timestamp",
                },
                enabled: false,
            })
        })
    })
})
