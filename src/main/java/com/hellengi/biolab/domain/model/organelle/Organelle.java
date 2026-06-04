package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;

public interface Organelle {
    String code();
    String displayName();
    boolean present();
    double mass(Cell cell, YamlConfig.CellProperties config);
    double area(Cell cell, YamlConfig.CellProperties config);
}
