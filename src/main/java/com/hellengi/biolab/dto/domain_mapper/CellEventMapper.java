package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.domain.model.Event;
import com.hellengi.biolab.domain.model.ImpulseEvent;
import com.hellengi.biolab.dto.CellEventDto;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CellEventMapper {

    public List<CellEventDto> toDtoList(List<Event> events) {
        if (events == null) {
            return List.of();
        }

        return events.stream()
                .map(this::toDto)
                .toList();
    }

    public List<Event> toDomainList(List<CellEventDto> events) {
        if (events == null) {
            return List.of();
        }

        return events.stream()
                .map(this::toDomain)
                .toList();
    }

    private CellEventDto toDto(Event event) {
        if (event instanceof ImpulseEvent impulse) {
            return new CellEventDto(
                    impulse.type(),
                    impulse.getTime(),
                    impulse.getDuration(),
                    impulse.getImpulse(),
                    impulse.getNormalX(),
                    impulse.getNormalY()
            );
        }

        throw new IllegalArgumentException("Unsupported cell event type: " + event.type());
    }

    private Event toDomain(CellEventDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Cell event dto must not be null");
        }

        if (ImpulseEvent.TYPE.equals(dto.type())) {
            return new ImpulseEvent(
                    dto.time(),
                    dto.duration(),
                    valueOrZero(dto.impulse()),
                    valueOrZero(dto.normalX()),
                    valueOrZero(dto.normalY())
            );
        }

        throw new IllegalArgumentException("Unsupported cell event type: " + dto.type());
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }
}