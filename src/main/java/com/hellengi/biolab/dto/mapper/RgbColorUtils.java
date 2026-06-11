package com.hellengi.biolab.dto.mapper;

import com.hellengi.biolab.dto.RgbColorDto;

import static com.hellengi.biolab.util.Utils.clamp01;

public final class RgbColorUtils {
    private RgbColorUtils() {
    }

    public static RgbColorDto mix(RgbColorDto from, RgbColorDto to, double t) {
        double safeT = clamp01(t);
        return new RgbColorDto(
                (int) Math.round(from.r() + (to.r() - from.r()) * safeT),
                (int) Math.round(from.g() + (to.g() - from.g()) * safeT),
                (int) Math.round(from.b() + (to.b() - from.b()) * safeT),
                from.opacity() + (to.opacity() - from.opacity()) * safeT
        );
    }

    public static RgbColorDto mixWeighted(RgbColorDto a, double aw, RgbColorDto b, double bw, RgbColorDto c, double cw) {
        double sum = Math.max(0.001, aw + bw + cw);
        return new RgbColorDto(
                (int) Math.round((a.r() * aw + b.r() * bw + c.r() * cw) / sum),
                (int) Math.round((a.g() * aw + b.g() * bw + c.g() * cw) / sum),
                (int) Math.round((a.b() * aw + b.b() * bw + c.b() * cw) / sum),
                (a.opacity() * aw + b.opacity() * bw + c.opacity() * cw) / sum
        );
    }

    public static RgbColorDto mixWeighted(
            RgbColorDto a, double aw,
            RgbColorDto b, double bw,
            RgbColorDto c, double cw,
            RgbColorDto d, double dw
    ) {
        double sum = Math.max(0.000001, aw + bw + cw + dw);
        return new RgbColorDto(
                (int) Math.round((a.r() * aw + b.r() * bw + c.r() * cw + d.r() * dw) / sum),
                (int) Math.round((a.g() * aw + b.g() * bw + c.g() * cw + d.g() * dw) / sum),
                (int) Math.round((a.b() * aw + b.b() * bw + c.b() * cw + d.b() * dw) / sum),
                (a.opacity() * aw + b.opacity() * bw + c.opacity() * cw + d.opacity() * dw) / sum
        );
    }

    public static RgbColorDto withOpacity(RgbColorDto color, double opacity) {
        return new RgbColorDto(color.r(), color.g(), color.b(), clamp01(opacity));
    }
}
