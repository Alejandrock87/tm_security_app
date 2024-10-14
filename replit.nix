{pkgs}: {
  deps = [
    pkgs.opencl-headers
    pkgs.ocl-icd
    pkgs.glibcLocales
    pkgs.openssl
    pkgs.postgresql
  ];
}
