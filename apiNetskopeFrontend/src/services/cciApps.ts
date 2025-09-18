import api from "./api";

export async function uploadCciExcel(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/Gamma/cci/enrich/excel", formData, {
    responseType: "blob", // importante para manejar archivo descargable
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data as Blob;
}