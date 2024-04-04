"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Graphs from "./graphs";
import { DatasetInterface } from "~/types/Dataset";
import { Pencil, Trash } from "./icons";
import { formatBytes } from "./formatBytes";
import { toast } from "sonner"
import { apiURL } from "./const";
import { Oval } from "react-loader-spinner";

function AddDataset({ updateDatasets }: {
  updateDatasets: () => void,
}) {
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addDatasetName, setAddDatasetName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const isFormValid = useMemo(() => addFile !== null && addDatasetName.length > 0, [addFile, addDatasetName]);
  const fileInput = useRef<HTMLInputElement>(null);
  const addDatasetForm = useRef<HTMLFormElement>(null);

  return (
    <form className="bg-gray-100 p-4" ref={addDatasetForm}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!addFile) {
          toast.error("No file selected", { description: "Please select a file, then click upload", })
          return;
        }

        setUploading(true)
        const res = await fetch(`${apiURL}/dataset/${addDatasetName}/sections`, {
          method: "PUT",
          body: addFile,
        })
        if (!res.ok) {
          const data: { error: string } = await res.json()
          toast.error("Failed to upload file", { description: `Failed with error code ${res.status}: \"${data.error}\"` })
          setUploading(false)
          return;
        }
        const data: { result: Array<string> } = await res.json()
        toast("File uploaded", {
          description: `Dataset \"${data.result}\" has been uploaded successfully`, duration: 5000
        })

        setUploading(false)
        addDatasetForm.current!.reset();
        setAddFile(null);
        setAddDatasetName("");
        updateDatasets();
      }}
    >
      <h1 className="font-bold text-3xl">Add Dataset</h1>
      <div className="relative my-4">
        <input type="text"
          className="w-full rounded-full border-2 outline-none focus:ring py-1 px-3"
          placeholder="Dataset Name..." defaultValue={addDatasetName}
          onChange={e => {
            setAddDatasetName(e.target.value);
          }}
        />
        <Pencil className="absolute top-[50%] translate-y-[-50%] right-4 w-6 h-6 stroke-gray-400 pointer-events-none" strokeWidth={2} />
      </div>
      <div className="flex flex-row gap-x-2 items-center">
        <input type="file" name="" id="addFileInput" className="hidden" accept=".zip" ref={fileInput}
          onChange={(e) => setAddFile(e.target.files?.[0] || null)} />
        <div className="flex-1">
          <p>{addFile ? `${addFile.name} (${formatBytes(addFile.size)})` : "No File Selected"}</p>
        </div>
        <button className="bg-black hover:bg-zinc-700 transition-colors text-white rounded-md px-4 py-2"
          type="button" onClick={() => fileInput.current?.click()}>
          Select File
        </button>
        <button type="submit" disabled={!isFormValid || uploading}
          className="bg-black hover:bg-zinc-700 disabled:bg-black transition-colors text-white disabled:text-gray-400 px-4 py-2 rounded-md relative">
          {
            uploading &&
            <Oval
              visible={true}
              height="20"
              width="20"
              strokeWidth="8"
              color="white"
              secondaryColor="white"
              ariaLabel="oval-loading"
              wrapperClass="absolute top-[50%] translate-y-[-50%] left-[50%] translate-x-[-50%]"
            />
          }
          <p className={`${uploading ? "invisible" : ""}`}>Add Dataset</p>
        </button>
      </div>
    </form>
  )
}


const ListDatasets = ({ setSelectedDataset, datasets, updateDatasets }: {
  setSelectedDataset: (d: DatasetInterface) => void,
  datasets: DatasetInterface[] | null,
  updateDatasets: () => void,
}) => {
  async function deleteDataset(d: DatasetInterface) {
    const res = await fetch(`${apiURL}/dataset/${d.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data: {error: string} = await res.json()
      toast.error("Failed to delete dataset", { description: `An error occurred while deleting this dataset: \"${data.error}\"` })
      return;
    }

    const data: {result: string} = await res.json()
    toast("Dataset deleted", {
      description: `Dataset \"${data.result}\" has been deleted successfully`,
      duration: 5000
    })
    updateDatasets();
  }

  return (
    <div className="bg-gray-100 p-4">
      <h1 className="font-bold text-3xl mb-4">Datasets</h1>
      {
        datasets !== null
          ? datasets.length > 0
            ?
            <div className="flex flex-col gap-y-2">
              {
                datasets.map(d => (
                  <div className="flex flex-row gap-x-2 items-center" key={d.id}>
                    <p className="flex-1">{d.id} ({d.numRows} rows)</p>
                    <button onClick={() => setSelectedDataset(d)} className="px-4 py-2 bg-black text-white rounded-sm">View Insights</button>
                    <button onClick={() => deleteDataset(d)}><Trash className="h-6 w-6" strokeWidth={2} /></button>
                  </div>
                ))
              }
            </div>
            : <p>No Datasets. Add a dataset above</p>
          :
          <div className="grid place-items-center">
            <Oval visible={true} height="50" width="50" strokeWidth="8" color="#4fa94d" ariaLabel="oval-loading" wrapperClass="" />
          </div>
      }
    </div>
  )
}

export default function Home() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetInterface | null>(null);
  const [datasets, setDatasets] = useState<DatasetInterface[] | null>(null);
  async function updateDatasets() {
    setDatasets(null)
    const res = await fetch(`${apiURL}/datasets`)
    if (!res.ok) {
      toast.error("Failed to load datasets")
      return;
    }
    const data: { result: DatasetInterface[] } = await res.json()
    setDatasets(data.result);
  }
  useEffect(() => { updateDatasets(); }, []);

  return (
    <main className="px-10 py-10">
      {/* Top Bar */}
      <div>
        <h1 className="text-3xl font-black text-blue-900 mb-4">UBC</h1>
      </div>
      <div className="flex flex-row gap-x-6">
        {/* Left */}
        <div className="flex-[2] flex flex-col gap-y-4">
          <AddDataset updateDatasets={updateDatasets} />
          <ListDatasets datasets={datasets} updateDatasets={updateDatasets} setSelectedDataset={setSelectedDataset} />
        </div>
        {/* Right */}
        <div className="flex-[3]">
          {
            selectedDataset && datasets && datasets.length > 0
              ? <Graphs selectedDataset={selectedDataset} datasets={datasets} />
              : <div>Add a dataset, then select a dataset by clicking on "View Insights"</div>
          }
        </div>
      </div>
    </main>
  );
}
