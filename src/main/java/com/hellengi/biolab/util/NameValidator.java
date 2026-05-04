package com.hellengi.biolab.util;

public final class NameValidator {

    private NameValidator() {
    }

    public static String normalize(String value, String fieldName, int maxLength) {
        if (value == null) {
            throw new IllegalArgumentException(fieldName + " must not be null");
        }

        String trimmed = value.trim();

        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " must not be empty");
        }

        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }

        return trimmed;
    }
}