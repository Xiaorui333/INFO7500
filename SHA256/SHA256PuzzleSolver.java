import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Random;

public class SHA256PuzzleSolver {
    private static final String idHex = "ED00AF5F774E4135E7746419FEB65DE8AE17D6950C95CEC3891070FBB5B03C78";

    // Convert a hexadecimal string to a byte array
    private static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    // SHA-256 hash function
    private static byte[] sha256(byte[] input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return digest.digest(input);
    }

    public static void main(String[] args) {
        try {
            byte[] x = new byte[32];  // Random 32-byte array
            new Random().nextBytes(x);

            byte[] idBytes = hexStringToByteArray(idHex);
            byte[] concatenated = ByteBuffer.allocate(x.length + idBytes.length).put(x).put(idBytes).array();  // Concatenate x and idBytes

            byte[] hash = sha256(concatenated);

            // Convert byte array to hexadecimal string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) hexString.append(String.format("%02x", b));

            System.out.println("SHA-256 Hash of x || id: " + hexString.toString());
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
    }
}
