package com.hellengi.biolab.domain.spawn;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.physics.MotionForces;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.SpawnCellRequestDto;
import com.hellengi.biolab.dto.domain_mapper.CellMapper;
import com.hellengi.biolab.dto.domain_mapper.GenomeMapper;
import static com.hellengi.biolab.util.Utils.*;
import com.hellengi.biolab.util.ControlScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class CellFactory {
    private final YamlConfig baseConfig;
    private final CellMapper cellMapper;
    private final GenomeMapper genomeMapper;
    private final MotionForces motionForces;
    private final Random random = new Random();

    public void fill(SimulationWorld world, int amount) {
        for (int i = 0; i < amount; i++) {
            world.addCell(createRandomCell());
        }
    }

    public void loadSnapshot(SimulationWorld world, List<CellDto> cells) {
        if (cells != null) {
            for (CellDto dto : cells) {
                world.addCell(cellMapper.toDomain(dto));
            }
        }
    }

    public Cell createCell(SpawnCellRequestDto requestDto) {
        Genome genome = genomeMapper.toDomain(requestDto.genome());
        double initialEnergy = Math.min(baseConfig.getCell().getStartEnergy(), genome.getMaxEnergy());
        Point worldCenter = new Point(baseConfig.worldCenterX(), baseConfig.worldCenterY());
        Point point = clampInsideCircle(worldCenter, baseConfig.worldRadius(), requestDto.x(), requestDto.y());
        Velocity velocity = toVelocity(
                requestDto.initialDirection(), Math.max(0.0, requestDto.initialSpeed())
        );

        Cell cell = new Cell(baseConfig);
        cell.setPosition(point.x(), point.y());
        cell.setVelocity(velocity.vx(), velocity.vy());
        cell.setEnergy(initialEnergy);
        cell.setGenome(genome);
        cell.setDirectionAngle(requestDto.initialDirection());
        applyInitialDamage(
                cell,
                requestDto.startNucleusDamage(),
                requestDto.startCytosolDamage(),
                requestDto.startCpDamage(),
                requestDto.startMembraneDamage(),
                requestDto.startLysosomeDamage(),
                requestDto.startFlagellumDamage()
        );
        cell.ensureInternalLayoutInitialized();
        return cell;
    }

    public Cell createRandomCell() {
        Genome genome = createRandomGenome();
        double initialDirection = randomControl(baseConfig.getMotion().getCellDirection());
        double initialSpeed = randomControl(baseConfig.getMotion().getCellSpeed());
        Velocity velocity = toVelocity(initialDirection, initialSpeed);
        double initialEnergy = baseConfig.getCell().getStartEnergy();
        double x = baseConfig.worldCenterX() + randomOffset(baseConfig.getCell().getOffsetRange());
        double y = baseConfig.worldCenterY() + randomOffset(baseConfig.getCell().getOffsetRange());

        Cell cell = new Cell(baseConfig);
        cell.setPosition(x, y);
        cell.setVelocity(velocity.vx(), velocity.vy());
        cell.setEnergy(Math.min(initialEnergy, genome.getMaxEnergy()));
        cell.setGenome(genome);
        cell.setDirectionAngle(initialDirection);
        // Randomly generated starter cells must not inherit or randomize developer-only
        // starting damage controls. Those controls are only for explicitly spawned drafts.
        applyInitialDamage(cell, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        cell.ensureInternalLayoutInitialized();
        return cell;
    }

    private Genome createInitialGenome() {
        YamlConfig.GenomeProperties genome = baseConfig.getGenome();
        return new Genome(
                genome.getDivisionThreshold().getInitial(),
                genome.getDivisionImpulse().getInitial(),
                genome.getDivisionAngle().getInitial(),
                genome.getCytosolArea().getInitial(),
                genome.getCytosolDensity().getInitial(),
                false,
                genome.getGfp().getInitial(),
                genome.getElasticity().getInitial(),
                genome.isMelaninEnabledInitial(),
                genome.getMelaninPercent().getInitial(),
                genome.isChloroplastEnabledInitial(),
                genome.getChloroplastAmount().getInitial(),
                genome.getChlorophyll().getInitial(),
                genome.getCarotenoids().getInitial(),
                genome.isLysosomeEnabledInitial(),
                genome.getLysosomeAmount().getInitial(),
                genome.getLysosomeEnzymeActivity().getInitial(),
                genome.isFlagellumEnabledInitial(),
                genome.getFlagellumCount().getInitial(),
                genome.getFlagellumLength().getInitial(),
                genome.getFlagellumMotorPower().getInitial(),
                genome.getFlagellumPairSpreadAngle().getInitial(),
                genome.getFlagellumSteeringAsymmetry().getInitial()
        );
    }

    private Genome createRandomGenome() {
        Genome genome = createInitialGenome();
        randomizeGenomeControls(genome);
        randomizeOptionalFlags(genome);
        ensureOptionalAmounts(genome);
        return genome;
    }

    private void randomizeGenomeControls(Genome genome) {
        for (Method getter : YamlConfig.GenomeProperties.class.getMethods()) {
            if (getter.getParameterCount() != 0 || getter.getReturnType() != YamlConfig.Control.class) continue;
            String suffix = getter.getName().startsWith("get") ? getter.getName().substring(3) : "";
            if (suffix.isBlank() || suffix.startsWith("Start") || suffix.equals("Mutation")) continue;
            try {
                Method setter = Genome.class.getMethod("set" + suffix, double.class);
                YamlConfig.Control bounds = (YamlConfig.Control) getter.invoke(baseConfig.getGenome());
                setter.invoke(genome, randomControl(bounds));
            } catch (ReflectiveOperationException ignored) {
                // New controls without matching genome setters are simply not genome parameters.
            }
        }
    }

    private void randomizeOptionalFlags(Genome genome) {
        for (Method getter : YamlConfig.GenomeProperties.class.getMethods()) {
            if (getter.getParameterCount() != 0 || getter.getReturnType() != boolean.class) continue;
            String name = getter.getName();
            if (!name.startsWith("is") || !name.endsWith("EnabledInitial")) continue;
            String suffix = name.substring(2, name.length() - "Initial".length());
            if ("GfpEnabled".equals(suffix)) continue;
            try {
                Method setter = Genome.class.getMethod("set" + suffix, boolean.class);
                setter.invoke(genome, random.nextBoolean());
            } catch (ReflectiveOperationException ignored) {
                // Future optional organelles participate automatically if the Genome setter exists.
            }
        }
    }

    private void ensureOptionalAmounts(Genome genome) {
        if (genome.isChloroplastEnabled() && genome.getChloroplastAmount() < baseConfig.getGenome().getChloroplastAmount().getMin()) {
            genome.setChloroplastAmount(baseConfig.getGenome().getChloroplastAmount().getMin());
        }
        if (genome.isLysosomeEnabled() && genome.getLysosomeAmount() < baseConfig.getGenome().getLysosomeAmount().getMin()) {
            genome.setLysosomeAmount(baseConfig.getGenome().getLysosomeAmount().getMin());
        }
        if (genome.isFlagellumEnabled() && genome.getFlagellumCount() < baseConfig.getGenome().getFlagellumCount().getMin()) {
            genome.setFlagellumCount(baseConfig.getGenome().getFlagellumCount().getMin());
        }
    }

    private void applyInitialDamage(
            Cell cell,
            Double nucleusDamage,
            Double cytosolDamage,
            Double cpDamage,
            Double membraneDamage,
            Double lysosomeDamage,
            Double flagellumDamage
    ) {
        cell.setNucleusDamage(clamp01(nucleusDamage != null ? nucleusDamage : 0.0));
        cell.setCellDamage(clamp01(cytosolDamage != null ? cytosolDamage : 0.0));
        cell.setCpDamage(clamp01(cpDamage != null ? cpDamage : 0.0));
        cell.setMembraneDamage(clamp01(membraneDamage != null ? membraneDamage : 0.0));
        cell.setAllLysosomeDamage(clamp01(lysosomeDamage != null ? lysosomeDamage : 0.0));
        cell.setAllFlagellumDamage(clamp01(flagellumDamage != null ? flagellumDamage : 0.0));
    }

    private double randomControl(YamlConfig.Control control) {
        return ControlScale.randomValue(control, random);
    }

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}





