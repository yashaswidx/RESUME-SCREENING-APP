import google.generativeai as genai

genai.configure(api_key="AIzaSyAtn3GyU6_XdGnJq8XE5wGlFfQdEpxtMVg")

models = genai.list_models()

for m in models:
    print(f"Name: {m.name} | Generation Methods: {m.supported_generation_methods}")
