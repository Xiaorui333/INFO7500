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
            byte[] idBytes = hexStringToByteArray(idHex);
            Random random = new Random();

            while (true) {
                byte[] x = new byte[32];
                new Random().nextBytes(x);

                byte[] concatenated = ByteBuffer.allocate(x.length + idBytes.length).put(x).put(idBytes).array();
                byte[] hash = sha256(concatenated);

                // Check for the presence of 0x2F in the hash
                boolean found = false;
                for (byte b : hash) {
                    if (b == 0x2F) {
                        found = true;
                        break;
                    }
                }

                // print x in hexadecimal if found
                if (found) {
                    StringBuilder xHexString = new StringBuilder();
                    for (byte b : x) xHexString.append(String.format("%02x", b));

                    System.out.println("Found x: " + xHexString.toString());
                    break;
                }
            }
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
    }
}
