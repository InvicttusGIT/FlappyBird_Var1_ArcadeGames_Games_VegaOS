import os
import ftplib

# Environment variables from GitHub Actions
FTP_HOST = os.environ["REGION"]
FTP_USER = os.environ["STORAGE_ZONE"]
FTP_PASS = os.environ["STORAGE_PASSWORD"]

# Local path in the repo
LOCAL_PATH = "."  # root of the repo where GitHub Actions runs

# Remote path on Bunny Storage
REMOTE_PATH = "VegaOS/flappywings-V1"

def list_remote_dirs(ftp, path):
    """Return list of top-level folders in remote path"""
    dirs = []
    try:
        ftp.cwd(path)
        entries = []
        ftp.retrlines('LIST', entries.append)
        for entry in entries:
            if entry.lower().startswith('d'):  # Unix-style directory
                parts = entry.split()
                dirs.append(parts[-1])
    except ftplib.error_perm:
        return []
    return dirs

def remove_remote_dir(ftp, path):
    """Recursively remove a remote folder"""
    try:
        for item in ftp.nlst(path):
            try:
                ftp.delete(item)
            except ftplib.error_perm:
                remove_remote_dir(ftp, item)
        ftp.rmd(path)
        print(f"Deleted remote folder: {path}")
    except ftplib.error_perm:
        pass

def main():
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)

    remote_dirs = list_remote_dirs(ftp, REMOTE_PATH)

    # Only compare top-level folders inside the repo folder
    local_repo_path = os.path.join(LOCAL_PATH, "VegaOS", "flappywings-V1")
    local_dirs = []
    if os.path.exists(local_repo_path):
        local_dirs = [
            d for d in os.listdir(local_repo_path)
            if os.path.isdir(os.path.join(local_repo_path, d))
        ]

    # Delete remote folders not in local
    for folder in remote_dirs:
        if folder not in local_dirs:
            remote_folder_path = f"{REMOTE_PATH}/{folder}"
            remove_remote_dir(ftp, remote_folder_path)

    ftp.quit()

if __name__ == "__main__":
    main()