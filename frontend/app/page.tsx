"use client";

import { useEffect, useRef, useState } from "react";
import Graphs from "./graphs";
import { DatasetInterface } from "~/types/Dataset";
import { Pencil } from "./icons";
import { formatBytes } from "./formatBytes";
import { toast } from "sonner"

const AddDataset = () => {
  const [addFile, setAddFile] = useState<File | null>(null);
  const fileButton = useRef<HTMLInputElement>(null);
  const updateFile = () => {
    console.log(fileButton.current?.files)
    setAddFile(fileButton.current?.files?.[0] || addFile || null);
  }
  const uploadFile = () => {
    if (!addFile) {
      toast.error("No file selected", {
        description: "Please select a file, then click upload",
        // action: {
        //   label: "Undo",
        //   onClick: () => console.log("Undo"),
        // },
      })
      return;
    }
    // TODO upload file

    toast("File uploaded", {
      // description: "Sunday, December 03, 2023 at 9:00 AM",
      // action: {
      //   label: "Undo",
      //   onClick: () => console.log("Undo"),
      // },
    })
  }

  return (
    <div className="bg-gray-100 p-4">
      <h1 className="font-bold text-3xl">Add Dataset</h1>
      <div className="relative my-4">
        <input type="text"
          className="w-full rounded-full border-2 outline-none focus:ring py-1 px-3" placeholder="Dataset Name..."/>
        <Pencil className="absolute top-[50%] translate-y-[-50%] right-4 w-6 h-6 stroke-gray-400 pointer-events-none" strokeWidth={2} />
      </div>
      <div className="flex flex-row gap-x-2 items-center">
        <input type="file" name="" id="addFileInput" className="hidden" ref={fileButton} accept=".zip" onChange={updateFile} />
        <div className="flex-1">
          {
            addFile
            ? <p>{addFile.name} ({formatBytes(addFile.size)})</p>
            : <p>No File Selected</p>
          }
        </div>
        <button
          className="bg-black text-white rounded-md px-4 py-2"
          onClick={() => fileButton.current?.click()}
        >
          Select File
        </button>
        <button className="bg-black text-white px-4 py-2 rounded-md" onClick={uploadFile}>
          Add Dataset
        </button>
      </div>
    </div>
  )
}


const ListDatasets = ({ setSelectedDataset }: {
  setSelectedDataset: (d: DatasetInterface) => void
}) => {
  const [datasets, setDatasets] = useState<DatasetInterface[] | null>(null);
  useEffect(() => {
    // TODO load datasets
    setDatasets(null);
  }, []);
  function deleteDataset(d: DatasetInterface) {
    // TODO delete dataset
  }

  return (
    <div className="bg-gray-100 p-4">
      <h1 className="font-bold text-3xl mb-4">Datasets</h1>
      {
        datasets
          ? datasets.map(d => {
            return (
              <div>
                <p>Dataset Name</p>
                <button onClick={() => setSelectedDataset(d)}>View Insights</button>
                <button onClick={() => deleteDataset(d)}>Delete</button>
              </div>
            )
          })
          : <p>No Datasets. Add a dataset above</p>
      }
    </div>
  )
}

export default function Home() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetInterface | null>(null);
  return (
    <main className="px-10 py-10">
      {/* Top Bar */}
      <div>
        <h1 className="text-3xl font-black text-blue-900 mb-4">UBC</h1>
      </div>
      <div className="flex flex-row gap-x-6">
        {/* Left */}
        <div className="flex-[2] flex flex-col gap-y-4">
          <AddDataset />
          <ListDatasets setSelectedDataset={setSelectedDataset} />
        </div>
        {/* Right */}
        <div className="flex-[3]">
          {
            selectedDataset
              ? <Graphs selectedDataset={selectedDataset} />
              : <div>Select a dataset by clicking on "View Insights"</div>
          }
        </div>
      </div>
    </main>
  );
}
