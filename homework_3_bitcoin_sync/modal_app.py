
import modal
import subprocess

stub = modal.Stub("bitcoin_sync_app")

bitcoin_volume = modal.Volume.from_name("bitcoin_data")

@stub.function(
    image=modal.Image.from_dockerfile("Dockerfile"),
    volumes={"/bitcoin_data": bitcoin_volume},
    timeout=86400,
)
def run_bitcoind():
    subprocess.run([
        "bitcoind",
        "-datadir=/bitcoin_data",
        "-server=1",
        "-rpcuser=xiaorui_liu",
        "-rpcpassword=Frida1195433053#"
    ])

if __name__ == "__main__":
    run_bitcoind.spawn()
