package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.dto.DisplayLayersDto;

/** Group key for render payload reuse across sessions. */
public record RenderGroupKey(
        DisplayLayersDto displayLayers,
        ClientViewport viewport
) {
}
