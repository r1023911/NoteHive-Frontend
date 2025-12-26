<script setup>
const props = defineProps({
  openKey: { type: String, default: "" },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  canSave: { type: Boolean, default: false }
})

const emit = defineEmits(["update:title", "update:content", "save", "back", "delete"])

</script>

<template>
  <div class="note-view">
    <div class="note-top">
      <div class="note-left">
        <div class="note-coord">Note @ {{ openKey }}</div>

        <input
          class="note-title-input"
          :value="title"
          placeholder="Title..."
          @input="emit('update:title', $event.target.value)"
        />
      </div>

        <div class="note-actions">
            <button class="btn danger" @click="emit('delete')">Delete</button>
            <button class="btn" :disabled="!canSave" @click="emit('save')">Save</button>
            <button class="btn ghost" @click="emit('back')">Back</button>
        </div>

    </div>

    <textarea
      class="note-editor"
      :value="content"
      placeholder="Write anything..."
      @input="emit('update:content', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.note-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(240,191,85,1);
}

.note-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 3px solid rgba(165, 110, 16, 0.7);
}

.note-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 260px;
}

.note-coord {
  font-weight: 900;
  font-size: 18px;
  color: #2a1f0f;
}

.note-title-input {
  border: 3px solid rgba(165, 110, 16, 0.7);
  background: rgba(242, 211, 138, 0.75);
  border-radius: 12px;
  padding: 8px 10px;
  font-size: 16px;
  outline: none;
  color: #2a1f0f;
  font-weight: 800;
}

.note-actions {
  display: flex;
  gap: 10px;
}

.btn {
  border: 3px solid #a56e10;
  background: #e1a93a;
  padding: 6px 10px;
  border-radius: 12px;
  cursor: pointer;
  color: #2a1f0f;
  font-weight: 800;
}

.btn.ghost {
  background: transparent;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.note-editor {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 16px;
  font-size: 18px;
  line-height: 1.4;
  background: rgba(242, 211, 138, 0.75);
  color: #2a1f0f;
}

.btn.danger {
  background: rgba(200, 60, 30, 0.75);
  border-color: rgba(160, 20, 20, 0.9);
  color: #2a1f0f;
}

.btn.danger:hover {
  background: rgba(220, 70, 40, 0.9);
}


</style>
