import os
import subprocess
import sys

def patch_grpc_file(filepath):
    """
    Patches the generated *_pb2_grpc.py file to use relative imports
    for the _pb2 module, preventing ModuleNotFoundError in sub-packages.
    """
    if not os.path.exists(filepath):
        print(f"Warning: File {filepath} not found for patching.")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace absolute import with relative import
    old_import = "import ai_service_pb2 as ai__service__pb2"
    new_import = "from . import ai_service_pb2 as ai__service__pb2"
    
    if old_import in content:
        content = content.replace(old_import, new_import)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully patched relative import in {filepath}")
    else:
        print(f"No patch needed or already patched in {filepath}")

def compile():
    # Set cwd to project root
    proto_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(proto_dir)
    os.chdir(project_root)

    print(f"Working in Project root: {project_root}")
    
    # Target directories
    backend_grpc_dir = os.path.join("core_backend", "app", "services", "grpc")
    engine_grpc_dir = os.path.join("ai_engine", "app", "grpc")

    os.makedirs(backend_grpc_dir, exist_ok=True)
    os.makedirs(engine_grpc_dir, exist_ok=True)

    # Compile core_backend
    print("Compiling for Core Backend...")
    cmd_backend = [
        sys.executable, "-m", "grpc_tools.protoc",
        "-Iprotobuf",
        f"--python_out={backend_grpc_dir}",
        f"--grpc_python_out={backend_grpc_dir}",
        os.path.join("protobuf", "ai_service.proto")
    ]
    subprocess.run(cmd_backend, check=True)

    # Compile ai_engine
    print("Compiling for AI Engine...")
    cmd_engine = [
        sys.executable, "-m", "grpc_tools.protoc",
        "-Iprotobuf",
        f"--python_out={engine_grpc_dir}",
        f"--grpc_python_out={engine_grpc_dir}",
        os.path.join("protobuf", "ai_service.proto")
    ]
    subprocess.run(cmd_engine, check=True)

    # Write __init__.py files to make them packages
    with open(os.path.join(backend_grpc_dir, "__init__.py"), "w") as f:
        pass
    with open(os.path.join(engine_grpc_dir, "__init__.py"), "w") as f:
        pass

    # Patch import errors
    patch_grpc_file(os.path.join(backend_grpc_dir, "ai_service_pb2_grpc.py"))
    patch_grpc_file(os.path.join(engine_grpc_dir, "ai_service_pb2_grpc.py"))

    print("Protobuf compilation completed successfully!")

if __name__ == "__main__":
    compile()
