export async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        let details = "";

        try {
            details = await response.text();
        } catch (error) {
            details = "";
        }

        throw new Error(
            `${options.method || "GET"} ${url} failed: ${response.status}` +
            (details ? ` | ${details}` : "")
        );
    }

    return response;
}

export async function getJson(url) {
    const response = await request(url);
    return response.json();
}

export async function postJson(url, body) {
    return request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

export async function putJson(url, body) {
    return request(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

export async function del(url) {
    return request(url, { method: "DELETE" });
}