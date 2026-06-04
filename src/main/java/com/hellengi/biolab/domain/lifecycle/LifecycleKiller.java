package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.domain.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LifecycleKiller {
    public void killCell(Cell cell) {
        if (!cell.isAlive()) return;
        cell.setMass();
        cell.setAlive(false);
        cell.setLifetimeTicks(0.0);
    }
}
