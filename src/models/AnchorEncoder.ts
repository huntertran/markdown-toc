function isHexByte(value: string, index: number) {
    return value[index] === "%" && /^[0-9a-fA-F]{2}$/.test(value.slice(index + 1, index + 3));
}

function getUtf8SequenceLength(firstByte: number) {
    if (firstByte >= 0xC2 && firstByte <= 0xDF) {
        return 2;
    }

    if (firstByte >= 0xE0 && firstByte <= 0xEF) {
        return 3;
    }

    if (firstByte >= 0xF0 && firstByte <= 0xF4) {
        return 4;
    }

    return 0;
}

export function decodeNonAsciiAnchorPart(value: string) {
    let result = "";

    for (let index = 0; index < value.length;) {
        if (!isHexByte(value, index)) {
            result += value[index];
            index++;
            continue;
        }

        let encodedByte = value.slice(index, index + 3);
        let firstByte = parseInt(encodedByte.slice(1), 16);
        let sequenceLength = getUtf8SequenceLength(firstByte);

        if (sequenceLength === 0) {
            result += encodedByte;
            index += 3;
            continue;
        }

        let encodedSequence = encodedByte;
        let sequenceEnd = index + 3;

        for (let byteIndex = 1; byteIndex < sequenceLength; byteIndex++) {
            if (!isHexByte(value, sequenceEnd)) {
                encodedSequence = "";
                break;
            }

            encodedSequence += value.slice(sequenceEnd, sequenceEnd + 3);
            sequenceEnd += 3;
        }

        if (encodedSequence === "") {
            result += encodedByte;
            index += 3;
            continue;
        }

        try {
            result += decodeURIComponent(encodedSequence).toLocaleLowerCase();
            index = sequenceEnd;
        } catch {
            result += encodedByte;
            index += 3;
        }
    }

    return result;
}

export function encodeURIComponentPreservingUnicode(value: string) {
    return decodeNonAsciiAnchorPart(encodeURIComponent(value));
}
