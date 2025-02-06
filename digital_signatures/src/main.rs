use ring::error::Unspecified;
use ring::rand::SystemRandom;
use ring::signature::{EcdsaKeyPair, KeyPair, UnparsedPublicKey, ECDSA_P256_SHA256_ASN1, ECDSA_P256_SHA256_ASN1_SIGNING};
use data_encoding::HEXLOWER;

fn main() -> Result<(), Unspecified> {

    // Step 1: Create a cryptographically secure random number generator
    // cryptographically-secure means that the number coming out of this generator
    // or so random that no one would ever be able to predict or even generate this
    // number ever again.
    let rand = SystemRandom::new();

    // Step 2: Use the ring library to use the random number to create a secret key
    //  The term "pkcs8" is just a format for bytes, like hex is format for bytes.
    //  We don't need to know how the format works, we just need to be able to convert
    //  it to another format we can use.
    //
    // ECDSA_P256_SHA256_ASN1_SIGNING refers to a specific type of digital signature algorithm.
    //  Don't need to know how the algorithm works, just need to know that it has a type.
    //
    // Note how we are passing the random number generator to the secret key generation function.
    let pkcs8_bytes = EcdsaKeyPair::
        generate_pkcs8(&ECDSA_P256_SHA256_ASN1_SIGNING, &rand)?;

    // Step 3: Convert the secret key which is in pkcs8 into a different format that we can
    //  use to sign messages.
    let key_pair = EcdsaKeyPair::
    from_pkcs8(&ECDSA_P256_SHA256_ASN1_SIGNING, pkcs8_bytes.as_ref(), &rand)?;


    // Step 4: Take our message we want to sign and convert it an array of bytes (byte array)
    //  This message could also be a 100GB PDF that is a contract for a bank.
    const MESSAGE: &[u8]  = b"hello, world";

    // Step 5: Call the sign function using the key pair we generated.
    let sig = key_pair.sign(&rand, MESSAGE)?;

    // Step 6: Convert the signature to hex and print out
    let signature_hex = HEXLOWER.encode(sig.as_ref());
    println!("Signature in hex: {}", signature_hex);

    // Step 7: Pull out just the public key
    let peer_public_key_bytes = key_pair.public_key().as_ref();

    // Step 8: verify the signature using the public key and message
    let peer_public_key = UnparsedPublicKey::new(&ECDSA_P256_SHA256_ASN1, peer_public_key_bytes);

    const MESSAGE_BAD: &[u8]  = b"hello, world";
    peer_public_key.verify(MESSAGE_BAD, sig.as_ref())?;

    println!("Signature verified!");

    Ok(())
}


// use ring::error::Unspecified;
// use ring::rand::SystemRandom;
// use ring::signature::{EcdsaKeyPair, ECDSA_P256_SHA256_ASN1_SIGNING};
// use data_encoding::HEXLOWER;
//
// fn main()  -> Results<(), Unspecified> {
//     let rand = SystemRandom::new();
//
//     let pkcs8_bytes = EcdsaKeyPair::
//         generate_pkcs8(&ECDSA_P256_SHA256_ASN1_SIGNING,&rand)?;
//     let pkcs8_bytes = EcdsaKeyPair::
//     from_pkcs8(&ECDSA_P256_SHA256_ASN1_SIGNING, pkcs8_bytes.as_ref(),&rand)?;
//
//     const MESSAGE: &[u8] = b"hello world";
//
//     let sig: Signatures = key_pair.sign(&rand,MESSAGE)?
//
//     let signature_hex = HEXLOWER.encode(sig.as_ref());
//     println!("signature:{}",signature_hex)
//
//
//     ok(())
//
// }





//     // let pkcs8_bytes_results = EcdsaKeyPair::
//         generate_pkcs8(&ECDSA_P256_SHA256_ASN1_SIGNING,&rand);
//     if pkcs8_bytes_results.is_err(){
//         panic!("unable to generate keys")
//
//     let pkcs8_bytes = pkcs8_bytes_results.unwrap();



