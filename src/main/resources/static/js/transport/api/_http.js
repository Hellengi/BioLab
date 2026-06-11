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

export async function post(url) {
    return request(url, { method: "POST" });
}

export async function postJson(url, body) {
    return request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

export async function postForJson(url) {
    const response = await post(url);
    return response.json();
}

export async function postJsonForJson(url, body) {
    const response = await postJson(url, body);
    return response.json();
}

export async function putJson(url, body) {
    return request(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

export async function putJsonForJson(url, body) {
    const response = await putJson(url, body);
    return response.json();
}

export async function del(url) {
    return request(url, { method: "DELETE" });
}
